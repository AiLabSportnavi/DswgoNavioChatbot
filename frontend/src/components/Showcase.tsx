import { motion } from 'motion/react'
import { Bot, Chat } from './icons'

/** Mock website browser window with the Navio widget docked bottom-right. */
export default function Showcase() {
  return (
    <section className="relative mx-auto max-w-6xl px-6 py-20 md:py-28">
      {/* floating lime accent dots */}
      <span className="absolute left-10 top-10 h-2.5 w-2.5 rounded-full bg-brand-green/80" />
      <span className="absolute right-16 top-24 h-1.5 w-1.5 rounded-full bg-brand-green" />

      <motion.div
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-80px' }}
        transition={{ duration: 0.7, ease: 'easeOut' }}
        className="relative overflow-hidden rounded-3xl border border-black/[0.06] bg-white soft-shadow-lg"
      >
        {/* browser chrome */}
        <div className="flex items-center gap-2 border-b border-black/[0.05] bg-bg-base/60 px-5 py-3.5">
          <span className="h-3 w-3 rounded-full bg-zinc-300" />
          <span className="h-3 w-3 rounded-full bg-zinc-300" />
          <span className="h-3 w-3 rounded-full bg-zinc-300" />
          <div className="ml-4 flex-1">
            <div className="mx-auto w-full max-w-sm rounded-full bg-white px-4 py-1.5 text-center text-xs text-zinc-400">
              sportnavi.de
            </div>
          </div>
        </div>

        {/* faux page content */}
        <div className="relative h-[300px] bg-bg-base/40 p-8 md:h-[380px] md:p-12">
          <div className="h-7 w-40 rounded-full bg-zinc-200/80" />
          <div className="mt-6 grid grid-cols-3 gap-5">
            <div className="h-28 rounded-2xl bg-zinc-200/60" />
            <div className="h-28 rounded-2xl bg-zinc-200/60" />
            <div className="h-28 rounded-2xl bg-zinc-200/60" />
          </div>
          <div className="mt-5 h-3 w-2/3 rounded-full bg-zinc-200/70" />
          <div className="mt-3 h-3 w-1/2 rounded-full bg-zinc-200/70" />

          {/* embedded chat widget */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            whileInView={{ opacity: 1, scale: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.35, duration: 0.5, ease: 'easeOut' }}
            className="absolute bottom-6 right-6 w-64 overflow-hidden rounded-2xl border border-black/[0.06] bg-white soft-shadow"
          >
            <div className="flex items-center gap-2 border-b border-black/[0.05] px-4 py-3">
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-brand-green">
                <Bot className="h-4 w-4" />
              </span>
              <span className="font-display text-sm font-semibold text-ink">Navio Bot</span>
              <span className="ml-auto h-2 w-2 rounded-full bg-brand-green" />
            </div>
            <div className="space-y-2 px-4 py-4">
              <div className="max-w-[85%] rounded-2xl rounded-tl-sm bg-bg-base px-3 py-2 text-xs text-ink">
                Hi, I’m Navio 👋 sport & wellness near you?
              </div>
              <div className="ml-auto max-w-[70%] rounded-2xl rounded-tr-sm bg-ink px-3 py-2 text-xs text-white">
                Yes, in Dortmund.
              </div>
            </div>
            <div className="flex items-center gap-2 border-t border-black/[0.05] px-3 py-2.5">
              <div className="flex-1 rounded-full bg-bg-base px-3 py-1.5 text-xs text-zinc-400">
                type a message…
              </div>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-green text-black">
                <Chat className="h-3.5 w-3.5" />
              </span>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </section>
  )
}
