import { useEffect, useRef, useState, type ComponentType, type SVGProps, type ReactNode } from 'react'
import { SignedIn, SignedOut, SignInButton, UserButton, useAuth } from '@clerk/clerk-react'
import PillButton from '../components/PillButton'
import GhostPill from '../components/GhostPill'
import CopyEmbed from '../components/CopyEmbed'
import ChatWidget from '../components/ChatWidget'
import ConfigEditor from '../components/ConfigEditor'
import RobotBrain from '../components/RobotBrain'
import {
  ArrowLeft, ArrowRight, Github, Bot, Bolt, Lock, Clock, Users, Briefcase,
  Compass, Globe, Code, Check, Clover, Chat, Sparkles,
} from '../components/icons'
import { navigate } from '../lib/router'
import { getBot } from '../data/bots'
import { getConfig, saveSystemPrompt } from '../lib/api'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

/* ── nav anchors (scroll-spied) ───────────────────────────────────────── */
const NAV = [
  { id: 'overview', label: 'overview' },
  { id: 'demo', label: 'live demo' },
  { id: 'trust', label: 'trust' },
  { id: 'tech', label: 'developers' },
  { id: 'embedding', label: 'embedding' },
  { id: 'prompt', label: 'system prompt' },
]

/* ── content drawn verbatim from docs/NAVIO.md ────────────────────────── */
const AUDIENCES: { icon: Icon; label: string; body: string }[] = [
  { icon: Users, label: 'Members & employees', body: 'Finding offers, how to check in at a gym, membership plans, cancellation, the app.' },
  { icon: Briefcase, label: 'Companies', body: 'Offering Sportnavi as an employee benefit, costs, tax topics, how staff sign up.' },
  { icon: Compass, label: 'Partners — studios & providers', body: 'Joining the network, the partner portal, payouts, QR-code check-ins.' },
]

const VISITOR_STEPS = [
  { t: 'the bubble appears', b: 'A small chat bubble appears in the corner of the website.' },
  { t: 'open the greeting', b: 'Clicking it opens a friendly greeting card, then the chat.' },
  { t: 'agree to privacy', b: 'A short Datenschutzhinweis is shown before every new conversation — the visitor must agree before chatting.' },
  { t: 'ask a question', b: 'Type a question, or tap a suggested one like “How do I check in?” — and Navio answers.' },
  { t: 'use the controls', b: 'Buttons at the top: learn about Navio, reset the conversation, or close the window.' },
]

const TRUST: { icon: Icon; t: string; b: string }[] = [
  { icon: Bot, t: 'Only official information', b: 'Navio is given the real Sportnavi FAQ and partner knowledge base, and is instructed to answer only from that content — it does not invent facts.' },
  { icon: Sparkles, t: 'Polite, even with tricky questions', b: 'If asked something it can’t or shouldn’t answer, it declines gently and steers back to Sportnavi topics — never a scary error.' },
  { icon: Lock, t: 'Privacy first', b: 'The visitor sees the privacy notice and must consent before anything is processed. A link to the full policy is always visible.' },
  { icon: Clock, t: 'Always on', b: 'Navio works 24/7, so visitors get help outside office hours.' },
]

const REPO: [string, string][] = [
  ['backend/app.py', 'The FastAPI service — all endpoints, security, and the model call'],
  ['backend/SYSTEM_PROMPT.md', 'Navio’s identity, tone rules, and the full embedded knowledge base'],
  ['backend/requirements.txt', 'Python dependencies'],
  ['backend/Dockerfile', 'Container build for the backend (Cloud Run / any host)'],
  ['backend/vercel.json', 'Serverless deploy entry for Vercel (FastAPI)'],
  ['frontend/src/data/bots.ts', 'Navio’s profile (name, greeting, quick replies, API URL, privacy text)'],
  ['frontend/src/components/NavioChat.tsx', 'The chat window UI (consent gate, messages, input)'],
  ['frontend/src/components/ChatWidget.tsx', 'The floating launcher bubble + greeting card'],
  ['frontend/src/lib/api.ts', 'The client that calls POST /api/chat'],
]

const ENDPOINTS: [string, string, string][] = [
  ['GET /health', 'Liveness/readiness check; returns model name + Turnstile state', 'none'],
  ['POST /api/chat', 'Main chat: send a message + recent history, get Navio’s reply', 'session token (if Turnstile on)'],
  ['POST /api/session', 'Mint a short-lived session token after a Turnstile challenge', 'Turnstile token'],
  ['GET /api/config', 'Read the current system prompt + privacy text', 'none'],
  ['POST /api/config/system-prompt', 'Update the system prompt (takes effect on next chat)', 'X-Admin-Token (if set)'],
  ['POST /api/config/datenschutz', 'Update the privacy text', 'X-Admin-Token (if set)'],
]

const CHAT_FLOW = [
  'The frontend sends { message, history } to POST /api/chat.',
  'The backend builds the message list: system prompt first (injected server-side), then the client’s history, then the new message. The client can never inject a system role.',
  'It calls Azure OpenAI (gpt-4.1) with temperature=0.4 and max_tokens=800.',
  'It returns { reply }.',
]

const ERRORS: { t: string; b: string }[] = [
  { t: 'Content-filter / bad request', b: 'Jailbreak, hate, violence, sexual, or any 400 → a polite bilingual refusal that redirects to Sportnavi topics.' },
  { t: 'Timeout / connection / rate-limit', b: 'Upstream error → a friendly “briefly unavailable, please try again” message.' },
  { t: 'Genuinely unexpected', b: 'Anything else is re-raised so real bugs aren’t hidden.' },
]

const SECURITY: { icon: Icon; t: string; b: ReactNode }[] = [
  { icon: Globe, t: 'CORS allowlist', b: <>Only configured origins (e.g. <Code2>sportnavi.de</Code2>) may call the API.</> },
  { icon: Bolt, t: 'Per-IP rate limiting', b: <>Default <b>15/min</b> and <b>300/day</b> (slowapi; in-memory by default, Redis when <Code2>REDIS_URL</Code2> is set).</> },
  { icon: Code, t: 'Strict input caps', b: <>Message ≤ <b>2000 chars</b>, history ≤ <b>10 turns</b> (enforced by Pydantic models).</> },
  { icon: Lock, t: 'Cloudflare Turnstile (optional)', b: <>When <Code2>TURNSTILE_SECRET</Code2> is set, the client must pass a challenge to get an HMAC-signed session token (30-min TTL). Empty secret → the layer is off (local dev).</> },
  { icon: Users, t: 'Admin writes', b: <>Config-write endpoints are gated by <Code2>ADMIN_TOKEN</Code2> when set.</> },
]

const ENV_VARS: [string, string, string][] = [
  ['AZURE_AI_CHATBOT_API_KEY', '(required)', 'Azure OpenAI key'],
  ['AZURE_AI_CHATBOT_OPENAI_ENDPOINT', '(required)', 'Azure endpoint (v1-compatible base URL)'],
  ['AZURE_AI_CHATBOT_DEPLOYMENT_NAME', '(required)', 'Deployment / model name (e.g. gpt-4.1)'],
  ['ALLOWED_ORIGINS', 'sportnavi.de + ncr4ailab.de', 'CORS allowlist (comma-separated)'],
  ['RATE_LIMIT_PER_MIN / _PER_DAY', '15 / 300', 'Per-IP limits'],
  ['MAX_MESSAGE_CHARS / MAX_HISTORY_TURNS', '2000 / 10', 'Input caps'],
  ['MAX_TOKENS / TEMPERATURE', '800 / 0.4', 'Model output limits'],
  ['TURNSTILE_SECRET', '(empty = off)', 'Enables the Turnstile + session-token layer'],
  ['SESSION_SECRET / SESSION_TTL_MIN', '(falls back) / 30', 'Session-token signing key + lifetime'],
  ['REDIS_URL', '(empty = in-memory)', 'Shared rate-limit store'],
  ['ADMIN_TOKEN', '(empty = open)', 'Gate for config-write endpoints'],
]

const QUICKREF: [string, ReactNode][] = [
  ['Model', <>Azure OpenAI <Code2>gpt-4.1</Code2></>],
  ['Languages', 'Any language — auto-detected per message'],
  ['Chat endpoint', <Code2>POST /api/chat</Code2>],
  ['Default rate limits', '15/min, 300/day per IP'],
  ['Input caps', '2000 chars/message, 10 history turns'],
  ['Privacy', 'Consent gate before every conversation'],
  ['Knowledge', 'Answers only from the embedded Sportnavi knowledge base'],
]

const LOCAL_DEV = `# Backend
cd backend
pip install -r requirements.txt
# create a .env with the AZURE_AI_CHATBOT_* keys (leave TURNSTILE_SECRET empty for dev)
uvicorn app:app --reload          # serves on http://127.0.0.1:8000

# Frontend (separate terminal)
cd frontend
npm install
npm run dev                       # Vite proxies /api -> 127.0.0.1:8000`

const PROD = `# Backend → Google Cloud Run (full runbook in DEPLOY.md)
gcloud run deploy navio --source ./backend --region europe-west3 --port 8000

# Frontend → Vercel (static SPA). Set VITE_NAVIO_API to the backend URL.
vercel --prod   # or: gcloud run deploy navio-frontend --source ./frontend`

/* ── tiny presentational helpers ──────────────────────────────────────── */
function Code2({ children }: { children: ReactNode }) {
  return <code className="rounded-md bg-black/[0.05] px-1.5 py-0.5 font-mono text-[0.85em] text-[#5f7d12]">{children}</code>
}

function Eyebrow({ children, light = false }: { children: ReactNode; light?: boolean }) {
  return (
    <span className={`text-xs font-semibold uppercase tracking-[0.2em] ${light ? 'text-brand-green' : 'text-[#6b8f12]'}`}>
      {children}
    </span>
  )
}

function SectionHead({ eyebrow, title, sub, center = true }: { eyebrow: string; title: string; sub?: string; center?: boolean }) {
  return (
    <div className={`${center ? 'mx-auto text-center' : ''} mb-12 max-w-2xl`}>
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">{title}</h2>
      {sub && <p className="mt-3 text-[17px] leading-relaxed text-zinc-600">{sub}</p>}
    </div>
  )
}

function PartBanner({ no, title, tag }: { no: string; title: string; tag: string }) {
  return (
    <div className="border-y border-black/[0.06] bg-white">
      <div className="mx-auto flex max-w-6xl flex-wrap items-baseline gap-x-5 gap-y-2 px-6 py-11 md:px-12">
        <span className="rounded-full bg-gradient-to-r from-brand-green to-[#74980f] px-3.5 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-black">
          {no}
        </span>
        <h2 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">{title}</h2>
        <span className="text-[15px] text-zinc-500">{tag}</span>
      </div>
    </div>
  )
}

function Card({ icon: I, sub, title, children, className = '' }: { icon?: Icon; sub?: string; title?: string; children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-3xl border border-black/[0.06] bg-white p-7 soft-shadow transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-green/40 ${className}`}>
      {I && (
        <span className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/15 text-ink">
          <I className="h-5 w-5" />
        </span>
      )}
      {sub && <div className="mb-2"><Eyebrow>{sub}</Eyebrow></div>}
      {title && <h3 className="mb-2 font-display text-lg font-semibold text-ink">{title}</h3>}
      <div className="text-[15px] leading-relaxed text-zinc-600">{children}</div>
    </div>
  )
}

function Node({ icon: I, t, d, brand = false }: { icon: Icon; t: string; d: ReactNode; brand?: boolean }) {
  return (
    <div className={`flex items-center gap-3.5 rounded-2xl border p-4 ${brand ? 'border-brand-green/40 bg-brand-green/10' : 'border-black/[0.07] bg-white'}`}>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-black/[0.06] bg-bg-base text-ink">
        <I className="h-5 w-5" />
      </span>
      <div>
        <div className="font-display text-sm font-semibold text-ink">{t}</div>
        <div className="text-xs text-zinc-500">{d}</div>
      </div>
    </div>
  )
}

function Arrow() {
  return <div className="py-1.5 text-center text-zinc-300">↓</div>
}

function Terminal({ name, code }: { name: string; code: string }) {
  return (
    <div className="overflow-hidden rounded-2xl bg-ink soft-shadow">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="h-2.5 w-2.5 rounded-full bg-white/15" />
        <span className="ml-2 font-mono text-xs text-brand-green">{name}</span>
      </div>
      <pre className="overflow-x-auto px-5 py-4">
        <code className="font-mono text-[13px] leading-relaxed text-zinc-200">
          {code.split('\n').map((line, i) => {
            const c = line.indexOf('#')
            const hasComment = c >= 0
            return (
              <div key={i}>
                {hasComment ? (
                  <>
                    <span>{line.slice(0, c)}</span>
                    <span className="text-zinc-500">{line.slice(c)}</span>
                  </>
                ) : (
                  line || ' '
                )}
              </div>
            )
          })}
        </code>
      </pre>
    </div>
  )
}

function DataTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  return (
    <div className="overflow-hidden rounded-3xl border border-black/[0.06] bg-white soft-shadow">
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-[14.5px]">
          <thead>
            <tr className="bg-bg-base">
              {head.map((h) => (
                <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wider text-[#6b8f12]">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-black/[0.05] transition-colors hover:bg-brand-green/[0.06]">
                {r.map((cell, j) => (
                  <td key={j} className={`px-5 py-3 align-top ${j === 0 ? 'font-medium text-ink' : 'text-zinc-600'}`}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const SECTION = 'scroll-mt-24 px-6 py-20 md:px-12 md:py-24'
const WRAP = 'mx-auto max-w-6xl'
const NARROW = 'mx-auto max-w-3xl'

/* ───────────────────────────────────────────────────────────────────── */
export default function BotDetail({ id }: { id: string }) {
  const bot = getBot(id)
  const { getToken } = useAuth()
  const sections = useRef<Record<string, HTMLElement | null>>({})
  const [activeId, setActiveId] = useState('overview')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [configLoading, setConfigLoading] = useState(true)

  // Save the prompt with the signed-in admin's Clerk token attached; the backend
  // verifies it and enforces the email-domain allowlist.
  const handleSavePrompt = async (content: string) => {
    const token = await getToken()
    await saveSystemPrompt(content, token)
  }

  useEffect(() => {
    let alive = true
    getConfig()
      .then((c) => alive && setSystemPrompt(c.system_prompt))
      .catch(() => {})
      .finally(() => alive && setConfigLoading(false))
    return () => { alive = false }
  }, [])

  useEffect(() => {
    const ratios: Record<string, number> = {}
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const sid = (e.target as HTMLElement).dataset.id
          if (sid) ratios[sid] = e.isIntersecting ? e.intersectionRatio : 0
        })
        const top = Object.entries(ratios).sort((a, b) => b[1] - a[1])[0]
        if (top && top[1] > 0) setActiveId(top[0])
      },
      { threshold: [0.2, 0.5], rootMargin: '-80px 0px -40% 0px' },
    )
    Object.values(sections.current).forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [id])

  if (!bot) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-bg-base">
        <p className="text-zinc-600">Chatbot “{id}” not found.</p>
        <PillButton onClick={() => navigate('/chatbots')}>back to chatbots</PillButton>
      </div>
    )
  }

  const register = (sid: string) => (el: HTMLElement | null) => { sections.current[sid] = el }
  const scrollToId = (sid: string) => sections.current[sid]?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  // Show the snippet for wherever the Hub is actually served from — the same origin
  // hosts the widget JS and proxies /api -> backend. Falls back to the configured
  // bot.apiUrl for any non-browser render.
  const apiOrigin =
    typeof window !== 'undefined' ? window.location.origin : new URL(bot.apiUrl).origin
  const embedSnippet = `<!-- Paste once, before </body>. The Datenschutz consent is built in. -->
<script
  src="${apiOrigin}/navio-widget.js"
  data-api="${apiOrigin}"
  data-policy-url="${bot.privacy.url}"
  async
></script>`

  return (
    <div className="min-h-screen bg-bg-base">
      {/* ── sticky top nav (P-CATION style, recolored) ──────────────────── */}
      <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-bg-base/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6 md:px-12">
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/chatbots')}
              className="flex items-center gap-1.5 text-sm lowercase text-zinc-500 transition-colors hover:text-ink"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">chatbots</span>
            </button>
            <span className="hidden h-5 w-px bg-black/10 sm:block" />
            <div className="flex items-center gap-2">
              <Clover className="h-4 w-4 text-ink" />
              <span className="font-display text-base font-semibold tracking-tight text-ink">{bot.name}</span>
              <span className="inline-flex items-center gap-1 rounded-full bg-brand-green/15 px-2 py-0.5 text-[10px] lowercase text-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                {bot.status}
              </span>
            </div>
          </div>

          <nav className="hidden items-center gap-7 lg:flex">
            {NAV.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => scrollToId(n.id)}
                className={`text-sm lowercase transition-colors ${activeId === n.id ? 'text-ink' : 'text-zinc-500 hover:text-ink'}`}
              >
                {n.label}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <SignedOut>
              <SignInButton mode="modal">
                <button
                  type="button"
                  className="hidden text-sm lowercase text-zinc-500 transition-colors hover:text-ink sm:inline"
                >
                  sign in
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton afterSignOutUrl="/" />
            </SignedIn>
            <PillButton size="sm" chip={<Chat className="h-3.5 w-3.5" />} onClick={() => scrollToId('demo')}>
              chat with {bot.name.toLowerCase()}
            </PillButton>
          </div>
        </div>
      </header>

      {/* ── hero (dark, green glow) ─────────────────────────────────────── */}
      <section
        ref={register('overview')}
        data-id="overview"
        className="scroll-mt-16 relative overflow-hidden text-white"
        style={{
          background:
            'radial-gradient(1100px 560px at 80% -10%, rgba(149,193,30,0.22), transparent 60%), linear-gradient(160deg,#161616 0%,#1b2410 55%,#172008 100%)',
        }}
      >
        {/* animated robot brain — fills the empty right-hand space */}
        <RobotBrain className="absolute right-0 top-1/2 hidden h-[clamp(420px,46vw,720px)] w-[clamp(420px,46vw,720px)] -translate-y-1/2 translate-x-[12%] opacity-90 lg:block" />

        <div className="relative z-10 mx-auto max-w-6xl px-6 py-24 md:px-12 md:py-28">
          <div className="max-w-3xl">
            <Eyebrow light>the Sportnavi chatbot</Eyebrow>
            <h1 className="mt-4 font-display text-5xl font-semibold tracking-tight md:text-7xl">Meet {bot.name}.</h1>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-zinc-300">
              The friendly digital assistant on the Sportnavi website — Germany’s corporate-fitness
              network. Like a <span className="text-brand-green">navi</span>gator, Navio guides every
              visitor safely to the right answer, day or night, in any language.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <div className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3">
                <div className="text-sm font-semibold">📖 For Everyone</div>
                <div className="text-xs text-zinc-400">no technical background needed</div>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/[0.06] px-4 py-3">
                <div className="text-sm font-semibold">🛠 For Developers &amp; IT</div>
                <div className="text-xs text-zinc-400">run, change, or deploy it</div>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-3">
              <PillButton size="md" chip={<Chat className="h-4 w-4" />} onClick={() => scrollToId('demo')}>
                try the live demo
              </PillButton>
              <GhostPill size="md" className="border-white/25 bg-white/10 text-white hover:border-white hover:bg-white/15" onClick={() => scrollToId('tech')}>
                jump to the tech
              </GhostPill>
            </div>

            <div className="mt-9 flex flex-wrap gap-3">
              {bot.stats.map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3">
                  <div className="font-display text-xl font-semibold text-white">{s.value}</div>
                  <div className="text-xs lowercase text-zinc-400">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── trust chip bar ──────────────────────────────────────────────── */}
      <div className="border-b border-black/[0.06] bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap justify-center gap-3 px-6 py-6">
          {[
            '🛡 only official Sportnavi content',
            '🔒 consent before every chat',
            '🕑 24/7 available',
            '🌍 any language',
            '🤖 Azure OpenAI · gpt-4.1',
          ].map((c) => (
            <span key={c} className="rounded-full border border-brand-green/30 bg-brand-green/10 px-4 py-2 text-[13.5px] font-medium text-ink">
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* ════════════════ PART 1 — FOR EVERYONE ════════════════ */}
      <PartBanner no="Part 1" title="For Everyone" tag="Non-technical — no background needed." />

      {/* What is Navio */}
      <section className={SECTION}>
        <div className={`${NARROW} space-y-5`}>
          <Eyebrow>what is Navio?</Eyebrow>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">A friendly guide at the door of Sportnavi</h2>
          <p className="text-[17px] leading-relaxed text-zinc-600">
            <b className="text-ink">Navio</b> is a friendly digital assistant — a chatbot — that lives on the{' '}
            <b className="text-ink">Sportnavi</b> website. Sportnavi is Germany’s corporate-fitness network: with a single
            membership, people can use thousands of sport and wellness offers — gyms, swimming pools, yoga, climbing, massage, and more.
          </p>
          <p className="text-[17px] leading-relaxed text-zinc-600">
            Navio’s job is simple: <b className="text-ink">answer visitors’ questions in plain language, day or night, in any
            language.</b> Think of it as a helpful guide standing at the door of Sportnavi who never gets tired and always knows where things are.
          </p>
          <p className="text-[17px] leading-relaxed text-zinc-600">
            The name says it all — like a <b className="text-ink">navi</b>gator, Navio guides people safely to the right answer.
          </p>
        </div>
      </section>

      {/* Who Navio helps */}
      <section className="border-y border-black/[0.06] bg-white px-6 py-20 md:px-12 md:py-24">
        <div className={WRAP}>
          <SectionHead eyebrow="who does Navio help?" title="Three audiences, adaptive depth" sub="Navio is built for three kinds of visitors and adapts how much detail it gives to each one." />
          <div className="grid gap-5 md:grid-cols-3">
            {AUDIENCES.map((a) => (
              <Card key={a.label} icon={a.icon} sub={a.label}>{a.body}</Card>
            ))}
          </div>
        </div>
      </section>

      {/* What Navio can do */}
      <section className={SECTION}>
        <div className={WRAP}>
          <SectionHead eyebrow="what can Navio do?" title="Four core jobs" />
          <div className="grid gap-5 sm:grid-cols-2">
            {bot.capabilities.map((c) => (
              <Card key={c.title} icon={c.icon} title={c.title}>{c.body}</Card>
            ))}
          </div>
        </div>
      </section>

      {/* How a visitor uses it */}
      <section className="border-y border-black/[0.06] bg-white px-6 py-20 md:px-12 md:py-24">
        <div className={WRAP}>
          <SectionHead eyebrow="how a visitor uses it" title="From bubble to answer" />
          <div className="grid gap-5 md:grid-cols-5">
            {VISITOR_STEPS.map((s, i) => (
              <div key={s.t} className="rounded-3xl border border-black/[0.06] bg-bg-base/50 p-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-brand-green to-[#74980f] font-display text-base font-semibold text-black">
                  {i + 1}
                </div>
                <h3 className="mt-4 font-display text-base font-semibold lowercase text-ink">{s.t}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{s.b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Live demo */}
      <section ref={register('demo')} data-id="demo" className={SECTION}>
        <div className={NARROW}>
          <SectionHead eyebrow="live demo" title="See it in action" sub="This is the real Navio — every reply comes from the live backend." />
          <div className="relative mx-auto h-[560px] max-w-xl overflow-hidden rounded-3xl border border-black/[0.06] bg-white soft-shadow-lg">
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center px-6 text-center">
              <span className="font-display text-sm font-medium text-zinc-400">So sieht Navio als Widget auf jeder Seite aus.</span>
              <span className="mt-1 text-xs text-zinc-400">Klick unten rechts auf Navio, um den Chat zu öffnen 👉</span>
            </div>
            <ChatWidget bot={bot} contained />
          </div>
        </div>
      </section>

      {/* Trustworthy */}
      <section ref={register('trust')} data-id="trust" className="scroll-mt-16 border-y border-black/[0.06] bg-white px-6 py-20 md:px-12 md:py-24">
        <div className={WRAP}>
          <SectionHead eyebrow="what makes Navio trustworthy" title="Built to earn trust" />
          <div className="grid gap-5 sm:grid-cols-2">
            {TRUST.map((t) => (
              <Card key={t.t} icon={t.icon} title={t.t}>{t.b}</Card>
            ))}
          </div>
        </div>
      </section>

      {/* Personality */}
      <section className={SECTION}>
        <div className={NARROW}>
          <div className="mb-10 max-w-2xl">
            <Eyebrow>the personality</Eyebrow>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">Warm, motivating, a little playful</h2>
            <p className="mt-3 text-[17px] leading-relaxed text-zinc-600">
              Never robotic. It speaks informally (the German <i>“du”</i>), uses emojis sparingly for warmth (👋🏻 💪🏻 💚), and keeps
              answers concrete and encouraging. For companies and partners it keeps the same friendly voice but adds more substance and precision.
            </p>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="rounded-3xl border border-black/[0.06] bg-zinc-100 p-6 text-[15.5px] leading-relaxed text-zinc-600">
              <span className="mb-2.5 block text-[11px] font-bold uppercase tracking-wider text-zinc-400">Robotic</span>
              “The notice period is one month to the end of a calendar month.”
            </div>
            <div className="rounded-3xl border border-brand-green/30 bg-white p-6 text-[15.5px] leading-relaxed text-zinc-700 soft-shadow">
              <span className="mb-2.5 block text-[11px] font-bold uppercase tracking-wider text-[#6b8f12]">🤖 Navio</span>
              “Your cancellation always takes effect at the end of the next full month — so if you cancel on 15 March, everything runs until 30 April. 👍🏻”
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════ PART 2 — FOR DEVELOPERS & IT ════════════════ */}
      <div ref={register('tech')} data-id="tech" className="scroll-mt-16">
        <PartBanner no="Part 2" title="For Developers & IT" tag="Technical — run, change, or deploy Navio." />
      </div>

      {/* Overview */}
      <section className={SECTION}>
        <div className={WRAP}>
          <SectionHead center={false} eyebrow="overview" title="A small, self-contained chatbot service" sub="Three pieces, one principle: the key and the system prompt live only on the server." />
          <div className="grid items-start gap-6 md:grid-cols-2">
            <div className="space-y-0">
              <Node icon={Globe} t="Visitor’s browser" d="React chat widget — renders UI, handles consent, calls the backend" />
              <Arrow />
              <Node brand icon={Bolt} t="FastAPI backend" d="backend/app.py — holds the system prompt + knowledge base and the Azure key" />
              <Arrow />
              <Node icon={Bot} t="Azure OpenAI" d="runs the gpt-4.1 model that generates replies" />
            </div>
            <div className="flex items-start gap-3.5 rounded-3xl border border-brand-green/30 bg-brand-green/10 p-6">
              <Lock className="mt-0.5 h-6 w-6 shrink-0 text-[#5f7d12]" />
              <p className="text-[15.5px] leading-relaxed text-zinc-700">
                <b className="text-ink">Key security principle:</b> the API key and the system prompt live{' '}
                <b className="text-ink">only on the backend</b> — never in the browser. The client can never inject a{' '}
                <Code2>system</Code2> role.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Repository layout */}
      <section className="border-y border-black/[0.06] bg-white px-6 py-20 md:px-12 md:py-24">
        <div className={WRAP}>
          <SectionHead center={false} eyebrow="repository layout" title="Navio’s parts" />
          <DataTable
            head={['Path', 'What it is']}
            rows={REPO.map(([p, d]) => [<Code2>{p}</Code2>, d])}
          />
        </div>
      </section>

      {/* Backend */}
      <section className={SECTION}>
        <div className={`${WRAP} space-y-16`}>
          <SectionHead center={false} eyebrow="backend" title="FastAPI, Azure OpenAI, and the security layer" />

          <div>
            <h3 className="mb-3 font-display text-xl font-semibold text-ink">Tech stack</h3>
            <p className="max-w-3xl text-[16px] leading-relaxed text-zinc-600">
              Python 3.13, <b className="text-ink">FastAPI</b> + <b className="text-ink">uvicorn</b>, the <b className="text-ink">OpenAI</b> SDK
              (pointed at an Azure endpoint), <b className="text-ink">slowapi</b> for rate limiting, <b className="text-ink">httpx</b> for the
              Turnstile call, and optional <b className="text-ink">Redis</b> for shared rate-limit counters.
            </p>
          </div>

          <div>
            <h3 className="mb-5 font-display text-xl font-semibold text-ink">Endpoints</h3>
            <DataTable
              head={['Method & path', 'Purpose', 'Auth']}
              rows={ENDPOINTS.map(([m, p, a]) => [<Code2>{m}</Code2>, p, <span className="text-zinc-500">{a}</span>])}
            />
          </div>

          <div>
            <h3 className="mb-5 font-display text-xl font-semibold text-ink">How a chat request is handled</h3>
            <div className="grid gap-5 md:grid-cols-4">
              {CHAT_FLOW.map((b, i) => (
                <div key={i} className="rounded-3xl border border-black/[0.06] bg-white p-6 soft-shadow">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-r from-brand-green to-[#74980f] font-display text-sm font-semibold text-black">{i + 1}</div>
                  <p className="mt-4 text-sm leading-relaxed text-zinc-600">{b}</p>
                </div>
              ))}
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-display text-xl font-semibold text-ink">Graceful error handling</h3>
            <p className="mb-5 text-[15px] text-zinc-500">Model errors never surface as a raw HTTP 500:</p>
            <div className="grid gap-5 md:grid-cols-3">
              {ERRORS.map((e) => <Card key={e.t} sub={e.t}>{e.b}</Card>)}
            </div>
          </div>

          <div>
            <h3 className="mb-5 font-display text-xl font-semibold text-ink">Security (v1)</h3>
            <div className="grid gap-5 sm:grid-cols-2">
              {SECURITY.map((s) => <Card key={s.t} icon={s.icon} title={s.t}>{s.b}</Card>)}
            </div>
          </div>

          <div>
            <h3 className="mb-5 font-display text-xl font-semibold text-ink">Configuration (environment variables)</h3>
            <DataTable
              head={['Variable', 'Default', 'Meaning']}
              rows={ENV_VARS.map(([v, def, m]) => [<Code2>{v}</Code2>, <span className="text-zinc-500">{def}</span>, m])}
            />
          </div>

          <div className="max-w-3xl">
            <h3 className="mb-3 font-display text-xl font-semibold text-ink">The system prompt &amp; knowledge base</h3>
            <p className="text-[16px] leading-relaxed text-zinc-600">
              <Code2>backend/SYSTEM_PROMPT.md</Code2> defines <b className="text-ink">who Navio is</b> (identity, audiences, tone,
              language rules, brand spelling “Sportnavi”) and embeds the <b className="text-ink">complete knowledge base</b> — the member
              FAQ, the company/Firmenfitness FAQ, and the partner FAQ. Navio answers <b className="text-ink">only</b> from this content. Edit
              it on disk, or live below via <Code2>POST /api/config/system-prompt</Code2> (applies on the next chat, no restart).
            </p>
          </div>
        </div>
      </section>

      {/* System prompt editor (real, backend-persisted) — admin-only via Clerk */}
      <section ref={register('prompt')} data-id="prompt" className="scroll-mt-16 border-t border-black/[0.06] bg-white px-6 py-20 md:px-12 md:py-24">
        <div className={NARROW}>
          {/* Signed-out visitors get a locked notice + sign-in; only signed-in,
              allow-listed admins (enforced by the backend) can actually save. */}
          <SignedOut>
            <div className="rounded-3xl border border-black/[0.08] bg-bg-base/50 p-8 text-center soft-shadow">
              <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/15 text-ink">
                <Lock className="h-5 w-5" />
              </span>
              <h2 className="font-display text-2xl font-semibold tracking-tight text-ink">System prompt — admin only</h2>
              <p className="mx-auto mt-2 max-w-md text-sm text-zinc-600">
                Editing Navio’s instructions is restricted to the Sportnavi team. Sign in to continue.
              </p>
              <div className="mt-6 flex justify-center">
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="rounded-full bg-brand-green px-6 py-2.5 text-sm font-medium text-white transition-transform hover:scale-[1.03]"
                  >
                    Sign in to edit
                  </button>
                </SignInButton>
              </div>
            </div>
          </SignedOut>

          <SignedIn>
            <div className="mb-6 flex items-center justify-end gap-3">
              <span className="text-xs lowercase text-zinc-500">signed in as admin</span>
              <UserButton afterSignOutUrl="/" />
            </div>
            <ConfigEditor
              title="System prompt"
              description="Navio’s instructions and baked-in knowledge base. Saved to backend/SYSTEM_PROMPT.md and applied to the next reply."
              value={systemPrompt}
              onChange={setSystemPrompt}
              onSave={handleSavePrompt}
              loading={configLoading}
              mono
            />
          </SignedIn>
        </div>
      </section>

      {/* Frontend */}
      <section className="border-y border-black/[0.06] bg-bg-base px-6 py-20 md:px-12 md:py-24">
        <div className={`${WRAP} space-y-12`}>
          <SectionHead center={false} eyebrow="frontend" title="The chat experience" />
          <p className="-mt-6 max-w-3xl text-[16px] leading-relaxed text-zinc-600">
            <b className="text-ink">Tech stack:</b> React + Vite + TypeScript, Tailwind CSS, and <Code2>motion/react</Code2> for animations.
          </p>
          <div className="grid gap-5 md:grid-cols-2">
            <Card sub="ChatWidget" title="The floating launcher">A bubble → greeting card → chat panel, fixed to the viewport (or <Code2>contained</Code2> for an in-page demo).</Card>
            <Card sub="lib/api.ts" title="The client"><Code2>sendChat(message, history)</Code2> calls <Code2>POST /api/chat</Code2>, trims to the backend caps, and turns 429s and other failures into readable messages. <Code2>setApiBase(url)</Code2> points the embed at the production backend.</Card>
            <Card sub="NavioChat" title="The chat window itself" className="md:col-span-2">
              <ul className="space-y-2">
                {[
                  <><b className="text-ink">Consent gate</b> — the privacy notice is shown before every new conversation and is not persisted; the input stays disabled until the visitor clicks <i>Zustimmen</i>.</>,
                  <><b className="text-ink">Greeting + quick replies</b> — a bilingual intro and tappable suggested questions.</>,
                  <><b className="text-ink">Messages</b> — user, bot (rendered as Markdown), and error bubbles, with a typing indicator while loading.</>,
                  <><b className="text-ink">Header controls</b> — about / reset / close.</>,
                  <><b className="text-ink">Always-visible privacy link</b> in the footer.</>,
                ].map((li, i) => (
                  <li key={i} className="flex gap-2.5"><Check className="mt-1 h-4 w-4 shrink-0 text-brand-green" /><span>{li}</span></li>
                ))}
              </ul>
            </Card>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <Card sub="Dev">The request path is relative (<Code2>/api/chat</Code2>) and Vite proxies it to the backend, so there’s no CORS.</Card>
            <Card sub="Production">Set <Code2>VITE_NAVIO_API</Code2> to the backend origin (e.g. <Code2>https://navio.sportnavi.de</Code2>).</Card>
          </div>
        </div>
      </section>

      {/* Running it */}
      <section className={SECTION}>
        <div className={`${WRAP} space-y-12`}>
          <SectionHead center={false} eyebrow="running it" title="Local development & production" />
          <div>
            <h3 className="mb-5 font-display text-xl font-semibold text-ink">Local development</h3>
            <Terminal name="terminal — local dev" code={LOCAL_DEV} />
          </div>
          <div className="grid items-start gap-6 md:grid-cols-2">
            <div>
              <h3 className="mb-5 font-display text-xl font-semibold text-ink">Production (managed hosting)</h3>
              <Terminal name="terminal — deploy" code={PROD} />
            </div>
            <div>
              <p className="mb-4 text-[15px] text-zinc-600">The backend and frontend deploy independently:</p>
              <div className="space-y-0">
                <Node icon={Globe} t="internet → frontend" d="static SPA on Vercel or a container (CDN-served)" />
                <Arrow />
                <Node brand icon={Bolt} t="backend" d="FastAPI on Cloud Run or Vercel functions" />
                <Arrow />
                <Node icon={Lock} t="Postgres" d="managed — Supabase or Azure — via one DATABASE_URL" />
              </div>
            </div>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            <Card icon={Globe} title="Frontend">Static SPA — host on Vercel or any container. Calls the backend directly at <Code2>VITE_NAVIO_API</Code2> (CORS-allowed by the backend).</Card>
            <Card icon={Bolt} title="Backend">Stateless FastAPI — Cloud Run, Vercel functions, or any container. Scales horizontally; set <Code2>REDIS_URL</Code2> once you run more than one instance.</Card>
            <Card icon={Lock} title="Database">Managed Postgres — Supabase or Azure — selected by one <Code2>DATABASE_URL</Code2>. Optional: the app still runs without it.</Card>
          </div>
        </div>
      </section>

      {/* Embedding */}
      <section ref={register('embedding')} data-id="embedding" className="scroll-mt-16 border-y border-black/[0.06] bg-white px-6 py-20 md:px-12 md:py-24">
        <div className={NARROW}>
          <SectionHead center={false} eyebrow="embedding" title="Embed anywhere" sub="One line and the full Navio widget appears — with the Datenschutz consent built in. It runs in an isolated container, so it won’t clash with your site’s styles." />
          <CopyEmbed code={embedSnippet} />
          <a
            href={bot.repo.url}
            target="_blank"
            rel="noreferrer"
            className="mt-6 flex items-center gap-4 rounded-3xl border border-black/[0.06] bg-bg-base/50 p-5 transition-colors hover:border-ink/20"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-ink soft-shadow">
              <Github className="h-6 w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <div className="font-mono text-sm text-ink">{bot.repo.name}</div>
              <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                <span className="inline-flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-brand-green" />{bot.repo.language}</span>
                <span className="truncate">{bot.repo.description}</span>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-ink px-4 py-1.5 text-xs lowercase text-white">view source</span>
          </a>
        </div>
      </section>

      {/* Quick reference */}
      <section className={SECTION}>
        <div className={WRAP}>
          <SectionHead eyebrow="quick reference" title="Everything at a glance" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {QUICKREF.map(([k, v]) => (
              <div key={k} className="rounded-2xl border border-black/[0.06] bg-white p-5 soft-shadow">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#6b8f12]">{k}</div>
                <div className="mt-1.5 text-[15.5px] font-medium text-ink">{v}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA band */}
      <section className="px-6 pb-24 md:px-12">
        <div className="mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-gradient-to-r from-brand-green to-[#74980f] px-8 py-14 text-center text-black soft-shadow-lg md:px-12">
          <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">Meet Navio 👋🏻</h2>
          <p className="mx-auto mt-3 max-w-xl text-[17px] text-black/75">
            Every reply comes from the official Sportnavi knowledge base — live, friendly, and around the clock.
          </p>
          <div className="mt-7 flex justify-center">
            <button
              type="button"
              onClick={() => scrollToId('demo')}
              className="inline-flex items-center gap-2 rounded-full bg-ink px-6 py-3 text-[15px] lowercase text-white transition-transform hover:scale-[1.03]"
            >
              chat with {bot.name.toLowerCase()}
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-green text-black"><ArrowRight className="h-3.5 w-3.5" /></span>
            </button>
          </div>
        </div>
      </section>

      {/* footer */}
      <footer className="border-t border-black/[0.06] bg-white px-6 py-10 md:px-12">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clover className="h-4 w-4 text-ink" />
            <span className="font-display text-sm tracking-tight text-ink">Sportnavi · {bot.name}</span>
          </div>
          <div className="flex items-center gap-5 text-sm text-zinc-500">
            <a href={bot.privacy.url} target="_blank" rel="noreferrer" className="transition-colors hover:text-ink">Datenschutz</a>
            <button type="button" onClick={() => scrollToId('tech')} className="lowercase transition-colors hover:text-ink">developers</button>
            <a href={bot.repo.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 transition-colors hover:text-ink">
              <Github className="h-4 w-4" /> GitHub
            </a>
          </div>
          <span className="text-xs text-zinc-400">the first Sportnavi chatbot</span>
        </div>
      </footer>

      {/* real floating launcher (this page has no global widget) */}
      <ChatWidget bot={bot} />
    </div>
  )
}
