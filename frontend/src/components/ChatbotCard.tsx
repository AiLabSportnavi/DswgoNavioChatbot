import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import PillButton from './PillButton'
import GhostPill from './GhostPill'
import type { Chatbot } from '../data/bots'

function MetaChip({ children }: { children: ReactNode }) {
  return (
    <span className="rounded-full border border-black/[0.07] bg-bg-base/70 px-2.5 py-1 text-[11px] lowercase text-zinc-600">
      {children}
    </span>
  )
}

export default function ChatbotCard({ bot }: { bot: Chatbot }) {
  const offline = bot.status === 'offline'

  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      whileHover={{ y: -6 }}
      className="flex flex-col rounded-3xl border border-black/[0.05] bg-white p-6 soft-shadow transition-shadow duration-300 hover:soft-shadow-lg"
    >
      {/* top row: avatar + status */}
      <div className="flex items-start justify-between">
        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-bg-base text-ink">
          <bot.icon className="h-6 w-6" />
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] lowercase ${
            offline ? 'bg-zinc-100 text-zinc-400' : 'bg-brand-green/15 text-ink'
          }`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${offline ? 'bg-zinc-300' : 'bg-brand-green'}`}
          />
          {bot.status}
        </span>
      </div>

      <h3 className="mt-5 font-display text-xl font-semibold tracking-tight text-ink">
        {bot.name}
      </h3>
      <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-zinc-600">{bot.description}</p>

      {/* meta chips */}
      <div className="mt-4 flex flex-wrap gap-2">
        <MetaChip>{bot.lang}</MetaChip>
        <MetaChip>{bot.category}</MetaChip>
        <MetaChip>embed: 1 line</MetaChip>
      </div>

      {/* actions */}
      <div className="mt-6 flex items-center gap-3 border-t border-black/[0.05] pt-5">
        <GhostPill href={`#/chatbots/${bot.id}`} className="flex-1">
          preview
        </GhostPill>
        {offline ? (
          <span className="inline-flex flex-1 cursor-not-allowed items-center justify-center gap-2 rounded-full bg-zinc-200 px-5 py-1.5 text-sm lowercase tracking-wide text-zinc-400">
            embed
          </span>
        ) : (
          <PillButton href={`#/chatbots/${bot.id}`} className="flex-1 justify-center">
            embed
          </PillButton>
        )}
      </div>
    </motion.div>
  )
}
