import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Info, Refresh, Close, Lock, Send, Check, ArrowRight } from './icons'
import { sendChat, MAX_MESSAGE_CHARS, type ChatTurn } from '../lib/api'
import type { Chatbot } from '../data/bots'

type Msg = { id: number; role: 'bot' | 'user' | 'error'; text: string; intro?: boolean }

const ADVANTAGES = [
  'Answers 24/7 in German & English',
  'Grounded only in the official SportNavi knowledge base',
  'Helps members, companies & partners',
  'Powered by Azure gpt-4.1 — your key stays server-side',
]

export default function NavioChat({
  bot,
  className = '',
  onClose,
  privacyNotice,
  privacyUrl,
}: {
  bot: Chatbot
  className?: string
  onClose?: () => void
  privacyNotice?: string
  privacyUrl?: string
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
  const [consented, setConsented] = useState(false)
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

    const history: ChatTurn[] = messages
      .filter((m) => !m.intro && m.role !== 'error')
      .map((m) => ({ role: m.role === 'bot' ? 'assistant' : 'user', content: m.text }))

    setMessages((prev) => [...prev, { id: idRef.current++, role: 'user', text }])
    setLoading(true)
    try {
      const reply = await sendChat(text, history)
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
      className={`flex flex-col overflow-hidden rounded-3xl border border-black/[0.06] bg-white ${className}`}
    >
      {/* header — SportNavi green */}
      <div className="flex items-center gap-3 bg-brand-green px-4 py-3 text-white">
        <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-green">
          <bot.icon className="h-5 w-5" />
        </span>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-sm font-semibold leading-tight">
            {bot.name} — SportNavi Guide
          </div>
          <div className="flex items-center gap-1.5 text-xs text-white/85">
            <span className="h-1.5 w-1.5 rounded-full bg-white" />
            Online
          </div>
        </div>
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

      {/* body */}
      {showInfo ? (
        <div className="flex-1 space-y-4 overflow-y-auto p-5">
          <div>
            <h3 className="font-display text-base font-semibold text-ink">About {bot.name}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{bot.tagline}</p>
          </div>
          <ul className="space-y-2">
            {ADVANTAGES.map((a) => (
              <li key={a} className="flex items-start gap-2 text-sm text-zinc-700">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-green/20 text-ink">
                  <Check className="h-3 w-3" />
                </span>
                {a}
              </li>
            ))}
          </ul>
          <p className="text-xs text-zinc-400">
            Your inputs are processed per our{' '}
            <a href={policyUrl} target="_blank" rel="noreferrer" className="underline">
              Privacy Policy
            </a>
            .
          </p>
          <button
            type="button"
            onClick={() => setShowInfo(false)}
            className="rounded-full bg-ink px-4 py-2 text-sm lowercase text-white"
          >
            back to chat
          </button>
        </div>
      ) : !consented ? (
        <div className="flex-1 overflow-y-auto p-4">
          <div className="rounded-2xl border border-black/[0.08] bg-white p-4 soft-shadow">
            <div className="flex items-center gap-2">
              <Lock className="h-4 w-4 text-brand-orange" />
              <span className="font-display text-sm font-semibold text-ink">Datenschutzhinweis</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-zinc-600">{notice}</p>
            <a
              href={policyUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-ink underline underline-offset-2 transition-colors hover:text-brand-green"
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
                className="flex-1 rounded-full border border-ink/15 px-4 py-2 text-sm text-ink transition-colors hover:border-ink/40"
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
                    ? 'ml-auto max-w-[80%] rounded-2xl rounded-tr-sm bg-ink px-3.5 py-2.5 text-sm whitespace-pre-wrap text-white'
                    : m.role === 'error'
                      ? 'max-w-[88%] rounded-2xl rounded-tl-sm border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-700'
                      : 'max-w-[85%] rounded-2xl rounded-tl-sm bg-bg-base px-3.5 py-2.5 text-sm whitespace-pre-wrap text-ink'
                }
              >
                {m.text}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <div className="flex max-w-[60%] items-center gap-1 rounded-2xl rounded-tl-sm bg-bg-base px-4 py-3">
              {[0, 1, 2].map((i) => (
                <motion.span
                  key={i}
                  className="h-1.5 w-1.5 rounded-full bg-zinc-400"
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
                  className="rounded-full border border-ink/15 bg-white px-3 py-1 text-xs text-zinc-600 transition-colors hover:border-ink/40 hover:text-ink"
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
        <form
          onSubmit={(e) => {
            e.preventDefault()
            send(input)
          }}
          className="flex items-center gap-2 border-t border-black/[0.05] px-3 py-3"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={!consented}
            maxLength={MAX_MESSAGE_CHARS}
            placeholder={consented ? 'ask navio…' : 'Bitte Datenschutz akzeptieren'}
            className="flex-1 rounded-full bg-bg-base px-4 py-2 text-sm text-ink placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-brand-green/40 disabled:cursor-not-allowed"
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
      )}

      {/* always-visible Datenschutz / Privacy Policy link */}
      <div className="border-t border-black/[0.04] bg-white px-4 py-2 text-center">
        <a
          href={policyUrl}
          target="_blank"
          rel="noreferrer"
          className="text-[11px] text-zinc-400 underline transition-colors hover:text-ink"
        >
          Datenschutz · Privacy Policy
        </a>
      </div>
    </div>
  )
}
