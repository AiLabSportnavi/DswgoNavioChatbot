import { motion } from 'motion/react'
import { Bot, Copy, Bolt } from './icons'

const FEATURES = [
  {
    icon: Bot,
    title: 'pick a bot',
    body: 'Open the hub and choose Navio — your ready-made Sportnavi guide for members, companies, and partners. More bots are on the way.',
  },
  {
    icon: Copy,
    title: 'copy one snippet',
    body: 'Grab the lightweight javascript snippet. No heavy dependencies or complex authentication required.',
  },
  {
    icon: Bolt,
    title: 'live on your site',
    body: "Paste it into your website's header. The bot is immediately active, styled, and ready to chat.",
  },
]

export default function Features() {
  return (
    <section id="how-it-works" className="mx-auto max-w-6xl px-6 pb-24">
      <div className="grid gap-5 md:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ delay: i * 0.1, duration: 0.55, ease: 'easeOut' }}
            className="rounded-3xl border border-black/[0.05] bg-white p-7 soft-shadow"
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-bg-base text-ink">
              <f.icon className="h-5 w-5" />
            </span>
            <h3 className="mt-5 font-display text-xl font-semibold lowercase tracking-tight text-ink">
              {f.title}
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-zinc-600">{f.body}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}
