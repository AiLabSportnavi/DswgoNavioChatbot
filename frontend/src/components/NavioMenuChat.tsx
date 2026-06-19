import { useState } from 'react'
import { Info, Refresh, Close, Lock, ArrowLeft, ArrowRight, Check } from './icons'
import NavioChat from './NavioChat'
import NavioMenu, { type MenuChoice } from './NavioMenu'
import KontaktForm from './KontaktForm'
import type { Chatbot } from '../data/bots'

type View = 'menu' | 'faq' | 'form'

const ADVANTAGES = [
  'Schreib in jeder Sprache – Navio antwortet in deiner',
  'Antwortet nur mit offiziellen Sportnavi-Infos – erfindet nichts',
  'DSGVO-konform – deine Zustimmung vor jeder Nutzung',
  'FAQ-Agent & Kontaktformular in einem Widget',
]

/**
 * "Navio Plus" experience (bot.flow === 'menu'). Same Datenschutz consent gate
 * as NavioChat, but after consent it shows a menu: FAQ agent (the real chat,
 * reused via NavioChat) or a modern Kontakt-Formular. Drop-in replacement for
 * NavioChat in ChatWidget — same prop signature.
 */
export default function NavioMenuChat({
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

  const [consented, setConsented] = useState(false)
  const [declined, setDeclined] = useState(false)
  const [view, setView] = useState<View>('menu')
  const [showInfo, setShowInfo] = useState(false)
  // Bumped on reset so the embedded FAQ chat remounts fresh.
  const [chatKey, setChatKey] = useState(0)

  const reset = () => {
    setConsented(false)
    setDeclined(false)
    setView('menu')
    setShowInfo(false)
    setChatKey((k) => k + 1)
  }

  const title = showInfo
    ? `Über ${bot.name}`
    : view === 'form'
      ? 'Kontakt aufnehmen'
      : view === 'faq'
        ? 'FAQ-Agent'
        : bot.name
  const subtitle = view === 'form' ? 'Antwort in 1–2 Werktagen' : 'Online'

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-3xl border border-black/[0.06] bg-white ${className}`}
    >
      {/* header — Sportnavi green */}
      <div className="flex items-center gap-3 bg-brand-green px-4 py-3 text-white">
        {(view !== 'menu' || showInfo) ? (
          <button
            type="button"
            onClick={() => (showInfo ? setShowInfo(false) : setView('menu'))}
            aria-label="Zurück"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/30"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        ) : (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-brand-green">
            <bot.icon className="h-5 w-5" />
          </span>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-sm font-semibold leading-tight">{title}</div>
          {!showInfo && (
            <div className="flex items-center gap-1.5 text-xs text-white/85">
              {subtitle === 'Online' && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
              {subtitle}
            </div>
          )}
        </div>
        {/* view-aware controls: info on the menu, reset in the chat, close always */}
        {view === 'menu' && !showInfo && (
          <button
            type="button"
            onClick={() => setShowInfo(true)}
            aria-label="Über diesen Chatbot"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/30"
          >
            <Info className="h-4 w-4" />
          </button>
        )}
        {view === 'faq' && !showInfo && (
          <button
            type="button"
            onClick={reset}
            aria-label="Unterhaltung zurücksetzen"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 transition-colors hover:bg-white/30"
          >
            <Refresh className="h-4 w-4" />
          </button>
        )}
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Schließen"
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
            <h3 className="font-display text-base font-semibold text-ink">Über {bot.name}</h3>
            <p className="mt-1.5 text-sm leading-relaxed text-zinc-600">{bot.tagline}</p>
          </div>
          <ul className="space-y-2.5">
            {ADVANTAGES.map((a) => (
              <li key={a} className="flex items-start gap-2 text-sm">
                <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-green/20 text-ink">
                  <Check className="h-3 w-3" />
                </span>
                <span className="text-zinc-700">{a}</span>
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setShowInfo(false)}
            className="rounded-full bg-ink px-4 py-2 text-sm lowercase text-white"
          >
            zurück
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
                Ohne deine Zustimmung kann Navio leider nicht fortfahren.
              </p>
            )}
            <div className="mt-4 flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setConsented(true)
                  setDeclined(false)
                }}
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
      ) : view === 'menu' ? (
        <NavioMenu bot={bot} onSelect={(c: MenuChoice) => setView(c)} />
      ) : view === 'faq' ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <NavioChat
            key={chatKey}
            bot={bot}
            embedded
            initialConsent
            privacyUrl={policyUrl}
            className="h-full"
          />
        </div>
      ) : (
        <KontaktForm bot={bot} onBack={() => setView('menu')} privacyUrl={policyUrl} />
      )}

      {/* always-visible Datenschutz / Privacy link */}
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
