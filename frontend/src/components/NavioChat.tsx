import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Info, Refresh, Close, Lock, Send, Check, ArrowRight, Sun, Moon } from './icons'
import { sendChat, MAX_MESSAGE_CHARS, type ChatTurn } from '../lib/api'
import Markdown from './Markdown'
import type { Chatbot } from '../data/bots'
import type { Theme } from '../lib/useTheme'

type Msg = {
  id: number
  role: 'bot' | 'user' | 'error'
  text: string
  intro?: boolean
}

// Non-technical trust points, shown German first then English (mirrors the
// bilingual greeting). No model/infra details here — this is the visitor-facing
// info panel, not the developer page.
const ADVANTAGES = [
  {
    de: 'Schreib in jeder Sprache – Navio antwortet in deiner',
    en: 'Write in any language — Navio replies in yours',
  },
  {
    de: 'Antwortet nur mit offiziellen Sportnavi-Infos – erfindet nichts',
    en: 'Answers only from official Sportnavi info — never invents facts',
  },
  {
    de: 'DSGVO-konform – deine Zustimmung vor jedem Chat',
    en: 'EU / GDPR-compliant — your consent before every chat',
  },
  {
    de: 'Hilft Mitgliedern, Firmen & Partnern – rund um die Uhr',
    en: 'Helps members, companies & partners — around the clock',
  },
]

export default function NavioChat({
  bot,
  className = '',
  onClose,
  privacyNotice,
  privacyUrl,
  embedded = false,
  initialConsent = false,
  theme,
  onToggleTheme,
}: {
  bot: Chatbot
  className?: string
  onClose?: () => void
  privacyNotice?: string
  privacyUrl?: string
  /**
   * When embedded inside another shell (e.g. the Navio Plus menu), drop this
   * component's own header + footer and outer border — the host provides them.
   */
  embedded?: boolean
  /** Skip the consent gate because the host already collected consent. */
  initialConsent?: boolean
  /** Current colour theme + toggle, surfaced as a header button (own header only). */
  theme?: Theme
  onToggleTheme?: () => void
}) {
  const notice = privacyNotice ?? bot.privacy.notice
  const policyUrl = privacyUrl ?? bot.privacy.url

  const idRef = useRef(2)
  const [messages, setMessages] = useState<Msg[]>([
    { id: 1, role: 'bot', text: bot.greeting, intro: true },
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [started, setStarted] = useState(false)
  // Consent is required at the start of every conversation (not persisted across
  // sessions) so the Datenschutz notice is always shown before any data is processed.
  const [consented, setConsented] = useState(initialConsent)
  const [declined, setDeclined] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, loading, consented, showInfo])

  const agree = () => {
    setConsented(true)
    setDeclined(false)
  }

  const reset = () => {
    setMessages([{ id: 1, role: 'bot', text: bot.greeting, intro: true }])
    idRef.current = 2
    setStarted(false)
    setInput('')
    setShowInfo(false)
    // A new conversation requires consent again.
    setConsented(false)
    setDeclined(false)
  }

  const send = async (raw: string) => {
    const text = raw.trim()
    if (!text || loading || !consented) return
    setInput('')
    setStarted(true)

    // Only real bot/user text goes into history — exclude intro and errors.
    const history: ChatTurn[] = messages
      .filter((m) => !m.intro && (m.role === 'bot' || m.role === 'user') && m.text.trim() !== '')
      .map((m) => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))

    setMessages((prev) => [...prev, { id: idRef.current++, role: 'user', text }])
    setLoading(true)
    try {
      const { reply } = await sendChat(text, history)
      setMessages((prev) => [...prev, { id: idRef.current++, role: 'bot', text: reply }])
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.'
      setMessages((prev) => [...prev, { id: idRef.current++, role: 'error', text: msg }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className={`flex flex-col overflow-hidden bg-surface text-fg ${
        embedded ? '' : 'rounded-3xl border border-border'
      } ${className}`}
    >
      {/* header — Sportnavi green (hidden when embedded; host provides it) */}
      {!embedded && (
      <div className="flex items-center gap-3 bg-brand-green px-4 py-3 text-white">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-green">
          <bot.icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-sm font-semibold leading-tight">
            {bot.name} — Sportnavi Guide
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/85">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            Online
          </div>
        </div>
        {onToggleTheme && (
          <button
            type="button"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
            title={theme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/30"
          >
            {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
        )}
        <button
          type="button"
          onClick={() => setShowInfo((v) => !v)}
          aria-label="About this chatbot"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/30"
        >
          <Info className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={reset}
          aria-label="Reset conversation"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/30"
        >
          <Refresh className="h-4 w-4" />
        </button>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/30"
          >
            <Close className="h-4 w-4" />
          </button>
        )}
      </div>
      )}

      {/* body */}
      {showInfo ? (
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <h3 className="font-display text-base font-semibold text-fg">Über {bot.name}</h3>
            <p className="text-xs leading-relaxed text-fg-subtle">About {bot.name}</p>
            <p className="mt-2 text-sm leading-relaxed text-fg-muted">
              {bot.name} ist dein freundlicher Guide durch Sportnavi – Deutschlands
              Firmenfitness-Netzwerk. Frag nach Angeboten, Mitgliedschaften, Partnern oder wie du
              Sportnavi in dein Unternehmen holst.
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-fg-subtle">
              {bot.name} is your friendly guide through Sportnavi — Germany’s corporate-fitness
              network. Ask about offers, memberships, partners, or bringing Sportnavi to your company.
            </p>
          </div>
          <ul className="space-y-2.5">
            {ADVANTAGES.map((a) => (
              <li key={a.de} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-green/20 text-fg">
                  <Check className="h-3 w-3" />
                </span>
                <span>
                  <span className="text-fg-muted">{a.de}</span>
                  <span className="block text-xs text-fg-subtle">{a.en}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="text-xs text-fg-subtle">
            Deine Eingaben werden gemäß unserer{' '}
            <a href={policyUrl} target="_blank" rel="noreferrer" className="underline">
              Datenschutzerklärung / Privacy Policy
            </a>{' '}
            verarbeitet.
          </p>
          <button
            type="button"
            onClick={() => setShowInfo(false)}
            className="rounded-full bg-fg px-4 py-2 text-sm lowercase text-surface"
          >
            zurück zum Chat
          </button>
        </div>
      ) : !consented ? (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="rounded-2xl border border-border bg-surface p-4 soft-shadow">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-brand-orange" />
              <span className="font-display text-sm font-semibold text-fg">Datenschutzhinweis</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-fg-muted">{notice}</p>
            <a
              href={policyUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-fg underline underline-offset-2 transition-colors hover:text-brand-green"
            >
              Zur Datenschutzerklärung / Privacy Policy
              <ArrowRight className="h-3.5 w-3.5" />
            </a>
            {declined && (
              <p className="mt-3 text-xs text-brand-orange">
                Ohne deine Zustimmung kann Navio leider nicht antworten.
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={agree}
                className="flex-1 rounded-full bg-brand-green px-4 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
              >
                Zustimmen
              </button>
              <button
                type="button"
                onClick={() => setDeclined(true)}
                className="flex-1 rounded-full border border-border px-4 py-2 text-sm text-fg transition-colors hover:border-fg/40"
              >
                Ablehnen
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto px-4 py-4">
          <AnimatePresence initial={false}>
            {messages.map((m) => (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={
                  m.role === 'user'
                    ? 'ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-user-bubble px-3.5 py-2.5 text-sm whitespace-pre-wrap text-user-bubble-fg'
                    : m.role === 'error'
                      ? 'max-w-[88%] rounded-2xl rounded-tl-sm border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700'
                      : m.intro
                        ? 'max-w-[85%] rounded-2xl rounded-tl-sm bg-surface-muted px-3.5 py-2.5 text-sm whitespace-pre-wrap text-fg'
                        : 'max-w-[85%] rounded-2xl rounded-tl-sm bg-surface-muted px-3.5 py-2.5 text-fg'
                }
              >
                {/* AI replies render as markdown (bold, links, lists, tables). The
                    intro greeting stays plain text so its bilingual line breaks survive. */}
                {m.role === 'bot' && !m.intro ? <Markdown>{m.text}</Markdown> : m.text}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <div className="flex max-w-[60%] items-center gap-1 rounded-2xl rounded-tl-sm bg-surface-muted px-4 py-3">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-brand-green"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.18 }}
                />
              ))}
            </div>
          )}

          {!started && (
            <div className="flex flex-wrap gap-2 pt-1">
              {bot.quickReplies.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => send(q)}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs text-fg-muted transition-colors hover:border-fg/40 hover:text-fg"
                >
                  {q}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {/* input */}
      {!showInfo && (
        <div className="border-t border-border">
          <form
            onSubmit={(e) => {
              e.preventDefault()
              send(input)
            }}
            className="flex items-center gap-2 px-3 py-3"
          >
            <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!consented}
            maxLength={MAX_MESSAGE_CHARS}
            placeholder={consented ? 'Frage Navio …' : 'Bitte Datenschutz akzeptieren'}
            className="flex-1 rounded-full bg-surface-muted px-4 py-2 text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-brand-green/40 disabled:cursor-not-allowed"
          />
          <button
            type="submit"
            disabled={!consented || loading || !input.trim()}
            aria-label="Send message"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-green text-white transition-opacity disabled:bg-zinc-200 disabled:text-zinc-400"
          >
            <Send className="h-4 w-4" />
          </button>
          </form>
        </div>
      )}

      {/* always-visible Datenschutz / Privacy Policy link (host provides it when embedded) */}
      {!embedded && (
        <div className="border-t border-border bg-surface px-4 py-2 text-center">
          <a
            href={policyUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-fg-subtle underline transition-colors hover:text-fg"
          >
            Datenschutz · Privacy Policy
          </a>
        </div>
      )}
    </div>
  )
}
