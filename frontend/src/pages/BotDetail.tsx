import { useEffect, useRef, useState } from 'react'
import { motion } from 'motion/react'
import PillButton from '../components/PillButton'
import GhostPill from '../components/GhostPill'
import CopyEmbed from '../components/CopyEmbed'
import NavioChat from '../components/NavioChat'
import ConfigEditor from '../components/ConfigEditor'
import DetailSidebar, { type Slide } from '../components/DetailSidebar'
import { ArrowLeft, ChevronUp, ChevronDown, Github, Bot, Copy, Bolt } from '../components/icons'
import { navigate } from '../lib/router'
import { getBot } from '../data/bots'
import { getConfig, saveSystemPrompt } from '../lib/api'

const SLIDES: Slide[] = [
  { id: 'overview', label: 'overview' },
  { id: 'capabilities', label: 'capabilities' },
  { id: 'live-demo', label: 'live demo' },
  { id: 'how-it-works', label: 'how it works' },
  { id: 'embedding', label: 'embedding' },
  { id: 'system-prompt', label: 'system prompt' },
]

const STEPS = [
  { icon: Bot, title: 'pick the bot', body: 'Navio is ready — no training or setup.' },
  { icon: Copy, title: 'copy the snippet', body: 'Point it at your backend’s /api/chat.' },
  { icon: Bolt, title: 'paste & go live', body: 'Drop it in your site. It’s instantly live.' },
]

export default function BotDetail({ id }: { id: string }) {
  const bot = getBot(id)
  const deckRef = useRef<HTMLDivElement>(null)
  const sections = useRef<Record<string, HTMLElement | null>>({})
  const ratios = useRef<Record<string, number>>({})
  const [activeId, setActiveId] = useState('overview')
  const [systemPrompt, setSystemPrompt] = useState('')
  const [configLoading, setConfigLoading] = useState(true)

  useEffect(() => {
    let alive = true
    getConfig()
      .then((c) => {
        if (alive) setSystemPrompt(c.system_prompt)
      })
      .catch(() => {})
      .finally(() => alive && setConfigLoading(false))
    return () => {
      alive = false
    }
  }, [])

  useEffect(() => {
    const root = deckRef.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          const sid = (e.target as HTMLElement).dataset.id
          if (sid) ratios.current[sid] = e.isIntersecting ? e.intersectionRatio : 0
        })
        const top = Object.entries(ratios.current).sort((a, b) => b[1] - a[1])[0]
        if (top && top[1] > 0) setActiveId(top[0])
      },
      { root, threshold: [0.25, 0.5, 0.75] },
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

  const endpoint = `POST ${bot.apiUrl}`
  const apiOrigin = new URL(bot.apiUrl).origin
  const embedSnippet = `<!-- Paste once, before </body>. The Datenschutz consent is built in. -->
<script
  src="${apiOrigin}/navio-widget.js"
  data-api="${apiOrigin}"
  data-policy-url="${bot.privacy.url}"
  async
></script>`

  const register = (sid: string) => (el: HTMLElement | null) => {
    sections.current[sid] = el
  }
  const scrollToId = (sid: string) =>
    sections.current[sid]?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const activeIdx = SLIDES.findIndex((s) => s.id === activeId)
  const step = (delta: number) => {
    const target = SLIDES[activeIdx + delta]
    if (target) scrollToId(target.id)
  }

  const slideClass =
    'relative flex min-h-screen snap-start flex-col justify-center px-8 py-20 md:px-16 lg:px-24'

  return (
    <div className="flex h-screen overflow-hidden bg-bg-base">
      <DetailSidebar
        bot={bot}
        slides={SLIDES}
        activeId={activeId}
        onNavigate={scrollToId}
        endpoint={endpoint}
      />

      {/* deck column */}
      <div className="relative h-screen flex-1">
        <div ref={deckRef} className="h-full snap-y snap-mandatory overflow-y-auto scroll-smooth">
          {/* 1 — overview */}
          <section ref={register('overview')} data-id="overview" className={slideClass}>
            <div className="max-w-2xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white px-3 py-1 text-xs lowercase text-ink">
                <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                chatbot · {bot.category}
              </span>
              <h1 className="mt-6 font-display text-5xl font-semibold tracking-tight text-ink md:text-7xl">
                Meet {bot.name}.
              </h1>
              <p className="mt-5 max-w-xl text-lg text-zinc-600">{bot.tagline}</p>

              <div className="mt-8 flex flex-wrap gap-3">
                {bot.stats.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-black/[0.06] bg-white px-5 py-3 soft-shadow"
                  >
                    <div className="font-display text-xl font-semibold text-ink">{s.value}</div>
                    <div className="text-xs lowercase text-zinc-500">{s.label}</div>
                  </div>
                ))}
              </div>

              <div className="mt-9 flex flex-wrap items-center gap-3">
                <PillButton size="md" onClick={() => scrollToId('embedding')}>
                  embed this bot
                </PillButton>
                <GhostPill size="md" onClick={() => scrollToId('live-demo')}>
                  try the demo
                </GhostPill>
              </div>
            </div>
          </section>

          {/* 2 — capabilities */}
          <section ref={register('capabilities')} data-id="capabilities" className={slideClass}>
            <div className="mx-auto w-full max-w-3xl">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-5xl">
                What {bot.name} can do
              </h2>
              <div className="mt-10 grid gap-4 sm:grid-cols-2">
                {bot.capabilities.map((c) => (
                  <div
                    key={c.title}
                    className="rounded-3xl border border-black/[0.05] bg-white p-6 soft-shadow"
                  >
                    <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-bg-base text-ink">
                      <c.icon className="h-5 w-5" />
                    </span>
                    <h3 className="mt-4 font-display text-lg font-semibold text-ink">{c.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{c.body}</p>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 3 — live demo (real backend) */}
          <section ref={register('live-demo')} data-id="live-demo" className={slideClass}>
            <div className="mx-auto w-full max-w-xl">
              <h2 className="text-center font-display text-3xl font-semibold tracking-tight text-ink md:text-5xl">
                See it in action
              </h2>
              <p className="mt-3 text-center text-sm text-zinc-500">
                This is the real Navio — every reply comes from the live backend.
              </p>
              <div className="mx-auto mt-8 h-[520px] soft-shadow-lg">
                <NavioChat bot={bot} className="h-full" />
              </div>
            </div>
          </section>

          {/* 4 — how it works */}
          <section ref={register('how-it-works')} data-id="how-it-works" className={slideClass}>
            <div className="mx-auto w-full max-w-4xl">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-5xl">
                Live in 3 steps
              </h2>
              <div className="relative mt-12 grid gap-5 md:grid-cols-3">
                <div className="absolute left-0 right-0 top-6 hidden h-px bg-black/[0.08] md:block" />
                {STEPS.map((s, i) => (
                  <div key={s.title} className="relative">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-ink font-display text-lg font-semibold text-brand-green">
                      {i + 1}
                    </div>
                    <div className="mt-5 rounded-3xl border border-black/[0.05] bg-white p-6 soft-shadow">
                      <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-bg-base text-ink">
                        <s.icon className="h-5 w-5" />
                      </span>
                      <h3 className="mt-4 font-display text-lg font-semibold lowercase text-ink">
                        {s.title}
                      </h3>
                      <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{s.body}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 5 — embedding & github */}
          <section ref={register('embedding')} data-id="embedding" className={slideClass}>
            <div className="mx-auto w-full max-w-3xl">
              <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-5xl">
                Embed anywhere
              </h2>
              <p className="mt-3 text-zinc-600">
                One line and the full Navio widget appears — with the Datenschutz consent built in.
                It runs in an isolated container, so it won’t clash with your site’s styles. Your
                Azure key and system prompt stay server-side. Approved for{' '}
                <code className="font-mono text-sm">sportnavi.de</code> and{' '}
                <code className="font-mono text-sm">ncr4ailab.de</code>.
              </p>

              <div className="mt-8">
                <CopyEmbed code={embedSnippet} />
              </div>

              <a
                href={bot.repo.url}
                target="_blank"
                rel="noreferrer"
                className="mt-6 flex items-center gap-4 rounded-3xl border border-black/[0.06] bg-white p-5 soft-shadow transition-colors hover:border-ink/20"
              >
                <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-base text-ink">
                  <Github className="h-6 w-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-sm text-ink">{bot.repo.name}</div>
                  <div className="mt-1 flex items-center gap-3 text-xs text-zinc-500">
                    <span className="inline-flex items-center gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-brand-green" />
                      {bot.repo.language}
                    </span>
                    <span className="truncate">{bot.repo.description}</span>
                  </div>
                </div>
                <span className="shrink-0 rounded-full bg-ink px-4 py-1.5 text-xs lowercase text-white">
                  view source
                </span>
              </a>
            </div>
          </section>

          {/* 6 — system prompt (editable, persisted to backend) */}
          <section ref={register('system-prompt')} data-id="system-prompt" className={slideClass}>
            <div className="mx-auto w-full max-w-3xl">
              <ConfigEditor
                title="System prompt"
                description="Navio’s instructions and baked-in knowledge base. Saved to backend/SYSTEM_PROMPT.md and applied to the next reply."
                value={systemPrompt}
                onChange={setSystemPrompt}
                onSave={saveSystemPrompt}
                loading={configLoading}
                mono
              />
            </div>
          </section>
        </div>

        {/* overlay: slide counter */}
        <div className="pointer-events-none absolute right-8 top-6 font-mono text-xs text-zinc-400">
          {String(activeIdx + 1).padStart(2, '0')} / {String(SLIDES.length).padStart(2, '0')}
        </div>

        {/* overlay: prev / next */}
        <div className="absolute bottom-8 right-8 flex flex-col gap-2">
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => step(-1)}
            disabled={activeIdx <= 0}
            aria-label="Previous slide"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.08] bg-white text-ink soft-shadow transition-opacity hover:border-ink/30 disabled:opacity-30"
          >
            <ChevronUp className="h-4 w-4" />
          </motion.button>
          <motion.button
            type="button"
            whileTap={{ scale: 0.92 }}
            onClick={() => step(1)}
            disabled={activeIdx >= SLIDES.length - 1}
            aria-label="Next slide"
            className="flex h-10 w-10 items-center justify-center rounded-full border border-black/[0.08] bg-white text-ink soft-shadow transition-opacity hover:border-ink/30 disabled:opacity-30"
          >
            <ChevronDown className="h-4 w-4" />
          </motion.button>
        </div>

        {/* mobile back */}
        <button
          type="button"
          onClick={() => navigate('/chatbots')}
          className="absolute left-8 top-6 inline-flex items-center gap-2 text-xs lowercase text-zinc-400 transition-colors hover:text-ink md:hidden"
        >
          <ArrowLeft className="h-4 w-4" />
          back
        </button>
      </div>
    </div>
  )
}
