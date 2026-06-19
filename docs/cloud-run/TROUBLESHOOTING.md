# Cloud Run Deploy — Troubleshooting

Real problems we hit deploying Navio, and exactly how each was fixed. Find your error
message below. For the full guide, see [README.md](README.md).

> The `309602963301` in commands below is this project's **project number**. Find yours with
> `gcloud projects describe navio-sportnavi-prod --format="value(projectNumber)"`.

---

## Quick lookup

| What you see | Cause | Fix |
|---|---|---|
| `Permission denied on secret … database-url` | A new secret isn't readable by Cloud Run | [Jump](#permission-denied-on-secret) |
| `NOT_FOUND: Secret … not found` | Secret doesn't exist yet | [Jump](#secret-not-found) |
| `Bad syntax for dict arg: [https://www…]` | Commas in `ALLOWED_ORIGINS` | [Jump](#bad-syntax-for-dict-arg-cors) |
| Chat gives a **CORS / network error** in the browser | Website origin not allowed | [Jump](#cors--network-error-in-the-browser) |
| **`Navio is unavailable right now (405)`** | Website calls a *relative* `/api` | [Jump](#chat-says-405--navio-is-unavailable) |
| `"database": false` or edits don't save | DB not reachable | [Jump](#database-not-connecting) |
| Same output every run / fix "won't apply" | Editor overwrote the script | [Jump](#the-script-wont-pick-up-changes) |
| Yellow "quota project" / "environment tag" warnings | Harmless nags | Ignore them |
| Deploy fails during **Building Container** | Build error | [Jump](#build-failed) |
| Login box is blank on the live site | Missing publishable key | [Jump](#blank-login-box) |
| `billing` error on deploy | Billing not enabled | Enable billing on the project, re-run |

---

## Permission denied on secret

```
ERROR: (gcloud.run.deploy) … Permission denied on secret:
projects/309602963301/secrets/database-url/versions/latest for Revision service account
309602963301-compute@developer.gserviceaccount.com. The service account must be granted
'Secret Manager Secret Accessor'.
```

**Why:** when a secret is **created fresh**, Cloud Run's runtime service account isn't
automatically allowed to read it.

> `./deploy.ps1` now **grants this automatically** for every secret it creates, so a normal
> run won't hit this. You only need the manual fix below if you add a *new* secret outside the
> script.

**Fix —** grant read access to that one secret:
```powershell
gcloud secrets add-iam-policy-binding database-url `
  --member="serviceAccount:309602963301-compute@developer.gserviceaccount.com" `
  --role="roles/secretmanager.secretAccessor"
```
Then re-run `./deploy.ps1`. (Do the same for any **new** secret name you add later.)

---

## Secret not found

```
ERROR: (gcloud.secrets.describe) NOT_FOUND: Secret … database-url … not found.
```

**Why:** the secret hasn't been created yet. The current `deploy.ps1` handles this (it lists
existing secrets and *creates* missing ones). If you hit it on an older script copy, create
the secret manually (no value printed to screen):
```powershell
# Reads DATABASE_URL from deploy.env and stores it, with no trailing-newline corruption
$v = (Get-Content deploy.env | Where-Object { $_ -match '^DATABASE_URL=' }) -replace '^DATABASE_URL=',''
$tmp = New-TemporaryFile; [System.IO.File]::WriteAllText($tmp.FullName, $v.Trim())
gcloud secrets create database-url --data-file="$($tmp.FullName)"
Remove-Item $tmp.FullName
```
Then grant access (see [above](#permission-denied-on-secret)) and re-run.

---

## Bad syntax for dict arg (CORS)

```
ERROR: (gcloud.run.services.update) argument --update-env-vars: Bad syntax for dict arg:
[https://www.sportnavi.de].
```

**Why:** `ALLOWED_ORIGINS` contains **commas**, and gcloud reads commas as separators between
multiple settings. You must tell gcloud to use a different separator with the `^@^` prefix.

**Fix —** set it manually with the comma-safe syntax (`@` becomes the separator):
```powershell
gcloud run services update navio --region europe-west3 `
  --update-env-vars "^@^ALLOWED_ORIGINS=https://sportnavi.de,https://www.sportnavi.de,https://navio-frontend-309602963301.europe-west3.run.app"
```
The current `deploy.ps1` already uses `^@^`, so a fresh run won't hit this.

---

## CORS / network error in the browser

The site loads but sending a chat fails with a CORS or network error in the browser console.

**Why:** the backend only answers browsers whose address is in `ALLOWED_ORIGINS`. The website
URL isn't on the list.

**Fix —** add the website's exact URL (both Cloud Run URL formats, to be safe):
```powershell
gcloud run services update navio --region europe-west3 `
  --update-env-vars "^@^ALLOWED_ORIGINS=https://sportnavi.de,https://www.sportnavi.de,https://navio-frontend-309602963301.europe-west3.run.app,https://navio-frontend-34ktkxptbq-ey.a.run.app"
```
Check what's currently set:
```powershell
gcloud run services describe navio --region europe-west3 --format="json(spec.template.spec.containers[0].env)" | Select-String ALLOWED_ORIGINS
```

---

## Chat says 405 / "Navio is unavailable"

The site loads but sending a chat shows **"Navio is unavailable right now (405)"**.

**Why:** the website is POSTing to a **relative** `/api/chat`, which hits the frontend's own
nginx (a static server that doesn't allow POST → **405 Method Not Allowed**). This means the
backend URL (`VITE_NAVIO_API`) **wasn't baked into the website build**.

**The sneaky root cause:** `gcloud run deploy --source` does **not** reliably ship
`frontend/.env.production` (which holds `VITE_NAVIO_API`) into the cloud build context — so
the build produced a site with no backend URL. (A *local* `npm run build` works fine, which
makes this very confusing.)

**Permanent fix (already in the repo):** `./deploy.ps1` no longer uses `--source` for the
frontend. It builds the image in **Cloud Build with the backend URL forced in as a
`--build-arg`** (via [`frontend/cloudbuild.yaml`](../../frontend/cloudbuild.yaml)), then
deploys that image. The URL is baked in **every time**, regardless of file-upload quirks — so
a normal `./deploy.ps1` just works. Confirm the deployed bundle contains the backend URL:
```powershell
$base = "https://navio-frontend-309602963301.europe-west3.run.app"
$js = (Invoke-WebRequest "$base/").Content | Select-String -Pattern '/assets/[^"]+\.js' -AllMatches | % { $_.Matches.Value }
(Invoke-WebRequest "$base$js").Content | Select-String 'navio-.*run\.app'   # should print the backend URL
```

**Manual one-off fix (if you ever need it)** — build the image yourself and deploy it. Works
with local Docker:
```powershell
$IMG = "europe-west3-docker.pkg.dev/navio-sportnavi-prod/cloud-run-source-deploy/navio-frontend:manual"
docker build --build-arg VITE_NAVIO_API=https://navio-XXXX.run.app -t $IMG ./frontend
docker push $IMG
gcloud run deploy navio-frontend --image $IMG --region europe-west3 --port 8080 --allow-unauthenticated
```
…or without local Docker, via Cloud Build:
```powershell
$IMG = "europe-west3-docker.pkg.dev/navio-sportnavi-prod/cloud-run-source-deploy/navio-frontend:manual"
gcloud builds submit ./frontend --config frontend/cloudbuild.yaml --substitutions="_VITE_NAVIO_API=https://navio-XXXX.run.app,_IMAGE=$IMG"
gcloud run deploy navio-frontend --image $IMG --region europe-west3 --port 8080 --allow-unauthenticated
```
Then **hard-refresh** the browser (`Ctrl+Shift+R`) to drop the old cached page.

> Tip: `405` = wrong place (hitting nginx). A **CORS** error = right place (the backend) but the
> origin isn't allowed. They're different problems — see the next section for CORS.

---

## Database not connecting

`/health` shows `"database": true` but admin prompt-saves don't persist, or chats aren't logged.

> Note: `"database": true` only means a `DATABASE_URL` is **set** — not that it connects. The
> backend hides DB errors on purpose so they never break chat, so failures are silent.

**Most common cause (Azure DB):** the **firewall** is blocking Cloud Run.
- Azure Portal → `navio-pg-001` → **Settings → Networking** → add a firewall rule
  **`0.0.0.0`–`255.255.255.255`** → **Save**. (Cloud Run's IPs are Google IPs and change, so
  the "Allow Azure services" toggle does **not** cover them.)

**Other checks:**
- **Tables exist?** Run [`backend/sql/schema.sql`](../../backend/sql/schema.sql) once against
  the DB (Supabase SQL Editor, or `psql`).
- **Right connection string?** Supabase must be the **pooler** URL (`…pooler.supabase.com`),
  not the `db.<ref>.supabase.co` direct one. Azure uses port `5432` (or `6432` if PgBouncer
  is enabled), with `sslmode=require`.
- **Read the logs** for the real reason:
  ```powershell
  gcloud run services logs read navio --region europe-west3 --limit 50
  ```

---

## The script won't pick up changes

You edit/fix `deploy.ps1` but every run produces the **identical** output (same error, same
operation IDs).

**Why:** the file is **open in your editor** (VS Code), and the editor saved its old copy
back over the change. The script that runs is the stale one.

**Fix —** close the `deploy.ps1` tab in your editor, confirm the file on disk is current, then
run again. (You can also verify a specific line: `Select-String 'update-env-vars' deploy.ps1`.)

---

## Build failed

```
X  Building and deploying... Building Container.
Deployment failed
```

**Why:** the container failed to build (a code/dependency error), not a config problem.

**Fix —** open the build log link gcloud prints (it looks like
`https://console.cloud.google.com/cloud-build/builds;region=europe-west3/<id>`), read the red
error, and fix the code. Re-run `./deploy.ps1`. The previous live version stays up until a
build succeeds, so the site never goes down from a failed build.

---

## Blank login box

The live site loads but the sign-in box is empty.

**Why:** the Clerk **publishable** key wasn't baked into the website build.

**Fix —** make sure [`frontend/.env.production`](../../frontend/.env.production) has a valid
`VITE_CLERK_PUBLISHABLE_KEY=pk_…`, then re-run `./deploy.ps1`. (For a production Clerk
instance, use the `pk_live_…` key and also add your domain in the Clerk dashboard.)

---

## Harmless warnings you can ignore

These appear on most gcloud commands and do **not** mean anything failed:
- `WARNING: Your active project does not match the quota project in your local Application
  Default Credentials…` — to silence it (optional):
  `gcloud auth application-default set-quota-project navio-sportnavi-prod`
- `Project … lacks an 'environment' tag…` — an organization policy nag; doesn't affect deploys.
