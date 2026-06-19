import { motion } from 'motion/react'
import { Bot, Mail, ArrowRight } from './icons'
import type { Chatbot } from '../data/bots'

export type MenuChoice = 'faq' | 'form'

/**
 * The Navio Plus menu — shown after the Datenschutz consent, before any chat.
 * Two large, on-brand option cards: the FAQ agent and the Kontakt-Formular.
 */
export default function NavioMenu({
  bot,
  onSelect,
}: {
  bot: Chatbot
  onSelect: (choice: MenuChoice) => void
}) {
  const options: {
    key: MenuChoice
    icon: typeof Bot
    title: string
    body: string
    accent: 'green' | 'orange'
  }[] = [
    {
      key: 'faq',
      icon: Bot,
      title: 'FAQ-Agent',
      body: 'Stell deine Frage – Navio antwortet sofort, rund um die Uhr.',
      accent: 'green',
    },
    {
      key: 'form',
      icon: Mail,
      title: 'Kontaktformular',
      body: 'Schreib uns direkt – wir melden uns zeitnah bei dir zurück.',
      accent: 'orange',
    },
  ]

  return (
    <div className="flex-1 overflow-y-auto px-4 py-5">
      <p className="px-1 text-sm leading-relaxed text-zinc-600">
        Wie können wir dir helfen? Wähle einfach aus 👇
      </p>

      <div className="mt-4 flex flex-col gap-3">
        {options.map((o, i) => {
          const accent =
            o.accent === 'green'
              ? {
                  tile: 'bg-brand-green/15 text-brand-green',
                  hover: 'hover:border-brand-green/50',
                  ring: 'group-hover:bg-brand-green',
                }
              : {
                  tile: 'bg-brand-orange/15 text-brand-orange',
                  hover: 'hover:border-brand-orange/50',
                  ring: 'group-hover:bg-brand-orange',
                }
          return (
            <motion.button
              key={o.key}
              type="button"
              onClick={() => onSelect(o.key)}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: i * 0.07 }}
              whileTap={{ scale: 0.985 }}
              className={`group flex items-center gap-4 rounded-2xl border border-black/[0.08] bg-white p-4 text-left soft-shadow transition-all duration-200 hover:-translate-y-0.5 ${accent.hover}`}
            >
              <span
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-colors ${accent.tile}`}
              >
                <o.icon className="h-6 w-6" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-display text-base font-semibold text-ink">
                  {o.title}
                </span>
                <span className="mt-0.5 block text-sm leading-snug text-zinc-500">{o.body}</span>
              </span>
              <span
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-bg-base text-zinc-400 transition-colors group-hover:text-white ${accent.ring}`}
              >
                <ArrowRight className="h-4 w-4" />
              </span>
            </motion.button>
          )
        })}
      </div>

      <p className="mt-5 px-1 text-xs leading-relaxed text-zinc-400">
        {bot.name} beantwortet Fragen rund um Sportnavi und leitet dich bei Bedarf an unser Team
        weiter.
      </p>
    </div>
  )
}
