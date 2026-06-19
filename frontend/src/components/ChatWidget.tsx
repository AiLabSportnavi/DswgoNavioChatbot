import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import NavioChat from './NavioChat'
import NavioMenuChat from './NavioMenuChat'
import { Chat, Close, ArrowRight } from './icons'
import { getBot, type Chatbot } from '../data/bots'

type View = 'closed' | 'card' | 'chat'

/**
 * Navio launcher. Collapsed it's a floating bubble; tapping it opens a greeting
 * card with a CTA to chat with Navio, and the chat itself expands from there.
 * (LIVOI-style launcher.)
 *
 * Defaults to fixed-to-viewport for the real embed. Pass `contained` to anchor it
 * inside a positioned parent instead (used by the "live demo" preview), and `bot`
 * to preview a specific bot rather than the default Navio.
 */
export default function ChatWidget({
  policyUrl,
  bot: botProp,
  contained = false,
}: {
  policyUrl?: string
  bot?: Chatbot
  contained?: boolean
} = {}) {
  const [view, setView] = useState<View>('closed')
  const bot = botProp ?? getBot('navio')
  if (!bot) return null

  return (
    <div
      className={`${contained ? 'absolute' : 'fixed'} bottom-6 right-6 z-40 flex flex-col items-end gap-3`}
    >
      <AnimatePresence mode="wait">
        {view === 'chat' ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="h-[min(560px,72vh)] w-[min(380px,calc(100vw-3rem))] origin-bottom-right soft-shadow-lg"
          >
            {bot.flow === 'menu' ? (
              <NavioMenuChat
                bot={bot}
                className="h-full"
                onClose={() => setView('closed')}
                privacyUrl={policyUrl}
              />
            ) : (
              <NavioChat
                bot={bot}
                className="h-full"
                onClose={() => setView('closed')}
                privacyUrl={policyUrl}
              />
            )}
          </motion.div>
        ) : view === 'card' ? (
          <motion.div
            key="card"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="w-[min(360px,calc(100vw-3rem))] origin-bottom-right overflow-hidden rounded-3xl border border-black/[0.06] bg-white soft-shadow-lg"
          >
            {/* greeting */}
            <div className="flex items-start gap-3 p-5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-green/15 text-brand-green">
                <bot.icon className="h-6 w-6" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="font-display text-base font-semibold text-ink">
                  Hi, ich bin Navio 👋🏻
                </div>
                <p className="mt-1 text-sm leading-relaxed text-zinc-600">
                  Dein Guide durch die Sportnavi Welt. Stell deine Fragen und bekomm
                  schnelle Antworten. 💚
                </p>
                <p className="mt-1.5 text-xs leading-relaxed text-zinc-400">
                  Your guide through the Sportnavi world — ask away and get answers fast.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setView('closed')}
                aria-label="Schließen"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-zinc-400 transition-colors hover:bg-black/5 hover:text-ink"
              >
                <Close className="h-4 w-4" />
              </button>
            </div>

            {/* CTA */}
            <div className="px-5 pb-5">
              <button
                type="button"
                onClick={() => setView('chat')}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-green px-4 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
              >
                <Chat className="h-4 w-4" /> Mit Navio chatten <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* launcher bubble — hidden while the chat panel is open */}
      {view !== 'chat' && (
        <motion.button
          key="fab"
          type="button"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setView((v) => (v === 'card' ? 'closed' : 'card'))}
          aria-label="Navio öffnen"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-brand-green shadow-[0_8px_30px_-6px_rgba(149,193,30,0.6)]"
        >
          {view === 'card' ? <Close className="h-6 w-6" /> : <Chat className="h-6 w-6" />}
        </motion.button>
      )}
    </div>
  )
}
