import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import NavioChat from './NavioChat'
import { Chat } from './icons'
import { getBot } from '../data/bots'

/** Floating live Navio launcher — the embeddable widget. */
export default function ChatWidget({ policyUrl }: { policyUrl?: string } = {}) {
  const [open, setOpen] = useState(false)
  const bot = getBot('navio')
  if (!bot) return null

  return (
    <div className="fixed bottom-6 right-6 z-40">
      <AnimatePresence mode="wait">
        {open ? (
          <motion.div
            key="panel"
            initial={{ opacity: 0, y: 16, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.96 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="h-[min(560px,72vh)] w-[min(380px,calc(100vw-3rem))] origin-bottom-right soft-shadow-lg"
          >
            <NavioChat
              bot={bot}
              className="h-full"
              onClose={() => setOpen(false)}
              privacyUrl={policyUrl}
            />
          </motion.div>
        ) : (
          <motion.button
            key="fab"
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileTap={{ scale: 0.94 }}
            onClick={() => setOpen(true)}
            aria-label="Chat with Navio"
            className="flex h-14 w-14 items-center justify-center rounded-full bg-ink text-brand-green shadow-[0_8px_30px_-6px_rgba(149,193,30,0.6)]"
          >
            <Chat className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  )
}
