<#
  Navio — one-command deploy to Google Cloud Run.

  WHAT IT DOES (in order, and it's safe to re-run any time):
    1. Reads your values from deploy.env  (git-ignored — secrets never hit git).
    2. Points gcloud at your project + switches on the needed APIs.
    3. Creates/updates the 3 secrets in Secret Manager (exact values, no newline bug).
    4. Deploys the BACKEND, then reads back its public URL.
    5. Writes that URL into frontend/.env.production and deploys the FRONTEND.
    6. Opens CORS so the browser is allowed to call the backend.
    7. Prints both URLs + a health-check link.

  USAGE (from the repo root, in PowerShell):
    Copy-Item deploy.env.example deploy.env   # then open deploy.env and fill it in
    ./deploy.ps1

  If Windows blocks the script, run it like this instead:
    powershell -ExecutionPolicy Bypass -File .\deploy.ps1
#>

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot   # always run from the repo root

# ── 1. Load deploy.env ───────────────────────────────────────────────────────
$envFile = Join-Path $PSScriptRoot "deploy.env"
if (-not (Test-Path $envFile)) {
  Write-Host "X  deploy.env not found." -ForegroundColor Red
  Write-Host "   Run:  Copy-Item deploy.env.example deploy.env   then fill it in." -ForegroundColor Yellow
  exit 1
}
$cfg = @{}
foreach ($raw in Get-Content $envFile) {
  $line = $raw.Trim()
  if (-not $line -or $line.StartsWith("#") -or -not $line.Contains("=")) { continue }
  $parts = $line -split "=", 2
  $key = $parts[0].Trim()
  $val = $parts[1].Trim()
  if ($val.StartsWith('"') -and $val.EndsWith('"') -and $val.Length -ge 2) {
    $val = $val.Substring(1, $val.Length - 2)
  }
  $cfg[$key] = $val
}

function Need($key) {
  if (-not $cfg.ContainsKey($key) -or [string]::IsNullOrWhiteSpace($cfg[$key])) {
    Write-Host "X  Missing '$key' in deploy.env" -ForegroundColor Red
    exit 1
  }
  return $cfg[$key]
}
function Die($msg) { Write-Host "X  $msg" -ForegroundColor Red; exit 1 }

$Project  = Need "GCP_PROJECT"
$Region   = Need "GCP_REGION"
$AzureKey = Need "AZURE_AI_CHATBOT_API_KEY"
$DbUrl    = Need "DATABASE_URL"
$ClerkSk  = Need "CLERK_SECRET_KEY"
$ClerkPk  = $cfg["VITE_CLERK_PUBLISHABLE_KEY"]   # optional
$SfId     = $cfg["SALESFORCE_CLIENT_ID"]         # optional (contact form -> Salesforce)
$SfSecret = $cfg["SALESFORCE_CLIENT_SECRET"]     # optional

# Cloud Run service names (optional in deploy.env; sensible defaults otherwise).
$BackendName  = if ($cfg["BACKEND_SERVICE"])  { $cfg["BACKEND_SERVICE"].Trim() }  else { "navio" }
$FrontendName = if ($cfg["FRONTEND_SERVICE"]) { $cfg["FRONTEND_SERVICE"].Trim() } else { "navio-frontend" }

Write-Host ""
Write-Host "==> Project: $Project   Region: $Region" -ForegroundColor Cyan
Write-Host "==> Services: $BackendName (backend) + $FrontendName (frontend)" -ForegroundColor Cyan

# ── 2. Point gcloud at the project + enable APIs ─────────────────────────────
gcloud config set project $Project --quiet | Out-Null
Write-Host "==> Enabling required APIs (skips any already on)..."
gcloud services enable run.googleapis.com cloudbuild.googleapis.com `
  artifactregistry.googleapis.com secretmanager.googleapis.com --quiet | Out-Null
if ($LASTEXITCODE -ne 0) { Die "Could not enable APIs (is billing on for $Project?)." }

# Cloud Run's default runtime service account. It must be granted permission to READ
# each secret, or the deploy fails with "Permission denied on secret". We compute it
# from the project number and grant access per-secret below (idempotent).
$ProjectNumber = (gcloud projects describe $Project --format="value(projectNumber)").Trim()
if ([string]::IsNullOrWhiteSpace($ProjectNumber)) { Die "Could not read the project number for $Project." }
$script:RuntimeSA = "$ProjectNumber-compute@developer.gserviceaccount.com"

# ── 3. Sync secrets to Secret Manager ────────────────────────────────────────
# We write each value to a temp file with NO trailing newline / BOM, so the secret
# is byte-for-byte exact (a stray newline in DATABASE_URL would break the DB login).
# We list existing secrets ONCE up front instead of calling `secrets describe` per
# name — describe errors when a secret doesn't exist yet, which would abort the run.
$script:existingSecrets = @()
$listed = gcloud secrets list --format="value(name)" --quiet
if ($LASTEXITCODE -eq 0 -and $listed) {
  $script:existingSecrets = @($listed -split "`r?`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ })
}
function Set-Secret($name, $value) {
  $tmp = New-TemporaryFile
  [System.IO.File]::WriteAllText($tmp.FullName, $value)
  if ($script:existingSecrets -contains $name) {
    gcloud secrets versions add $name --data-file="$($tmp.FullName)" --quiet | Out-Null
    Write-Host "    updated  $name"
  } else {
    gcloud secrets create  $name --data-file="$($tmp.FullName)" --quiet | Out-Null
    Write-Host "    created  $name"
  }
  Remove-Item $tmp.FullName -Force
  if ($LASTEXITCODE -ne 0) { Die "Failed to set secret $name." }
  # Let Cloud Run's runtime service account read this secret (idempotent — safe to
  # re-run). Without this, a fresh secret causes "Permission denied on secret" at deploy.
  gcloud secrets add-iam-policy-binding $name --member="serviceAccount:$($script:RuntimeSA)" --role="roles/secretmanager.secretAccessor" --quiet | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "    (warning: could not grant read access to $name - the deploy may fail on it)" -ForegroundColor Yellow
  }
}
Write-Host "==> Syncing secrets to Secret Manager..."
Set-Secret "azure-ai-chatbot-api-key" $AzureKey
Set-Secret "database-url"             $DbUrl
Set-Secret "clerk-secret-key"         $ClerkSk

# Build the --set-secrets list for the backend. Salesforce is OPTIONAL: only wired
# up when BOTH credentials are in deploy.env (otherwise the contact form simulates).
$script:SecretMap = "AZURE_AI_CHATBOT_API_KEY=azure-ai-chatbot-api-key:latest,DATABASE_URL=database-url:latest,CLERK_SECRET_KEY=clerk-secret-key:latest"
if (-not [string]::IsNullOrWhiteSpace($SfId) -and -not [string]::IsNullOrWhiteSpace($SfSecret)) {
  Set-Secret "salesforce-client-id"     $SfId
  Set-Secret "salesforce-client-secret" $SfSecret
  $script:SecretMap += ",SALESFORCE_CLIENT_ID=salesforce-client-id:latest,SALESFORCE_CLIENT_SECRET=salesforce-client-secret:latest"
  Write-Host "    + Salesforce contact form: ENABLED" -ForegroundColor Green
} else {
  Write-Host "    (no Salesforce creds in deploy.env - contact form stays in simulate mode)" -ForegroundColor Yellow
}

# ── 4. Deploy the BACKEND ────────────────────────────────────────────────────
Write-Host "==> Deploying backend ($BackendName) -- this takes a few minutes..." -ForegroundColor Cyan
gcloud run deploy $BackendName --source ./backend --region $Region --port 8000 `
  --no-cpu-throttling --max-instances 1 --allow-unauthenticated --quiet `
  --env-vars-file backend/cloudrun.env.yaml `
  --set-secrets "$($script:SecretMap)"
if ($LASTEXITCODE -ne 0) { Die "Backend deploy failed (the previous version stays live)." }
$BackendUrl = (gcloud run services describe $BackendName --region $Region --format="value(status.url)").Trim()
Write-Host "    backend live at  $BackendUrl" -ForegroundColor Green

# ── 5. Point the FRONTEND at the backend, then deploy it ─────────────────────
# Upsert the two browser-safe values into frontend/.env.production (the file the
# build reads). Comments are preserved; written UTF-8 with no BOM.
function Set-EnvLine($path, $key, $value) {
  $lines = @(); if (Test-Path $path) { $lines = @(Get-Content $path) }
  $found = $false
  $out = foreach ($l in $lines) {
    if ($l -match "^\s*$([regex]::Escape($key))\s*=") { $found = $true; "$key=$value" } else { $l }
  }
  if (-not $found) { $out = @($out) + "$key=$value" }
  [System.IO.File]::WriteAllLines($path, [string[]]$out)
}
$feEnv = Join-Path $PSScriptRoot "frontend/.env.production"
Set-EnvLine $feEnv "VITE_NAVIO_API" $BackendUrl
if (-not [string]::IsNullOrWhiteSpace($ClerkPk)) { Set-EnvLine $feEnv "VITE_CLERK_PUBLISHABLE_KEY" $ClerkPk }
Write-Host "==> Synced VITE_NAVIO_API into frontend/.env.production (for local builds)"

# Build the frontend image in Cloud Build with the backend URL forced in as a build-arg.
# We do NOT use `gcloud run deploy --source` here: that path doesn't reliably ship
# frontend/.env.production into the build, so VITE_NAVIO_API goes missing and the site
# calls a relative /api (→ 405). The build-arg guarantees the URL is baked in every time.
$FrontendImage = "${Region}-docker.pkg.dev/${Project}/cloud-run-source-deploy/${FrontendName}:deploy"
Write-Host "==> Building frontend image (backend URL baked in via build-arg)..." -ForegroundColor Cyan
gcloud builds submit ./frontend --config frontend/cloudbuild.yaml --substitutions="_VITE_NAVIO_API=$BackendUrl,_IMAGE=$FrontendImage" --quiet
if ($LASTEXITCODE -ne 0) { Die "Frontend image build failed." }

Write-Host "==> Deploying frontend ($FrontendName)..." -ForegroundColor Cyan
gcloud run deploy $FrontendName --image $FrontendImage --region $Region --port 8080 --allow-unauthenticated --quiet
if ($LASTEXITCODE -ne 0) { Die "Frontend deploy failed (the previous version stays live)." }
$FrontendUrl = (gcloud run services describe $FrontendName --region $Region --format="value(status.url)").Trim()
Write-Host "    frontend live at  $FrontendUrl" -ForegroundColor Green

# ── 6. Open CORS: add the frontend URL to ALLOWED_ORIGINS on the backend ─────
$base = ""
$m = Select-String -Path "backend/cloudrun.env.yaml" -Pattern '^ALLOWED_ORIGINS:\s*"?([^"]*)"?'
if ($m) { $base = $m.Matches[0].Groups[1].Value }
$origins = @($base -split "," | ForEach-Object { $_.Trim() } | Where-Object { $_ })
# Cloud Run serves a service at TWO URL shapes; allow both so the site works whichever
# one the visitor opens: the status URL (e.g. navio-frontend-abc123-ey.a.run.app) AND
# the legacy "<service>-<projectnumber>.<region>.run.app" form.
$legacyFrontendUrl = "https://$FrontendName-$ProjectNumber.$Region.run.app"
foreach ($o in @($FrontendUrl, $legacyFrontendUrl)) {
  if ($o -and ($origins -notcontains $o)) { $origins += $o }
}
$finalOrigins = ($origins -join ",")
Write-Host "==> Allowing the website to call the API (CORS)..."
gcloud run services update $BackendName --region $Region --update-env-vars "^@^ALLOWED_ORIGINS=$finalOrigins" --quiet | Out-Null
if ($LASTEXITCODE -ne 0) { Die "Could not update CORS on the backend." }

# ── 7. Done ──────────────────────────────────────────────────────────────────
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host " DEPLOYED" -ForegroundColor Green
Write-Host "   Website : $FrontendUrl   <-- open this" -ForegroundColor Green
Write-Host "   Backend : $BackendUrl"
Write-Host "   Health  : $BackendUrl/health   (should show \"database\": true)"
Write-Host "============================================================" -ForegroundColor Green
