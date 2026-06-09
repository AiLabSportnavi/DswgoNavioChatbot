import { motion } from 'motion/react'
import PillButton from './PillButton'
import GhostPill from './GhostPill'
import { MessageSquare, Code, Globe } from './icons'

const VIDEO_URL =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260603_132049_036591b8-6e92-4760-b94c-a7ea6eef315c.mp4'

const STATS = [
  { icon: MessageSquare, label: '12+ chatbot versions' },
  { icon: Code, label: 'embed in 1 line' },
  { icon: Globe, label: 'german + english' },
]

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: 0.15 + i * 0.1, duration: 0.6, ease: 'easeOut' as const },
  }),
}

export default function Hero() {
  return (
    <section className="relative flex min-h-screen w-full items-center justify-center overflow-hidden bg-bg-base">
      {/* Background motion — fullscreen looping video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="absolute inset-0 h-full w-full object-cover"
      >
        <source src={VIDEO_URL} type="video/mp4" />
      </video>

      {/* Light scrim — keeps the motion visible while ink text stays legible */}
      <div className="absolute inset-0 bg-gradient-to-b from-bg-base/85 via-bg-base/55 to-bg-base/90" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_50%_45%,rgba(237,238,245,0.65),transparent)]" />

      {/* Content */}
      <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-24 text-center">
        <motion.span
          custom={0}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="inline-flex items-center gap-2 rounded-full border border-ink/15 bg-white/70 px-4 py-1.5 text-xs lowercase tracking-wide text-ink backdrop-blur-sm"
        >
          <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
          ai chatbots for sportnavi.de
        </motion.span>

        <motion.h1
          custom={1}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mt-6 font-display text-5xl font-semibold leading-[1.05] tracking-tight text-ink [text-shadow:0_1px_24px_rgba(237,238,245,0.6)] md:text-7xl"
        >
          One hub. Every chatbot
          <br />
          you can embed.
        </motion.h1>

        <motion.p
          custom={2}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mt-6 max-w-xl text-base text-zinc-700 md:text-lg"
        >
          Drop a ready-made SportNavi chatbot onto any website in minutes. No complex setup,
          just seamless integration.
        </motion.p>

        <motion.div
          custom={3}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mt-9 flex flex-col items-center gap-3 sm:flex-row"
        >
          <PillButton href="#/chatbots" size="md">
            explore chatbots
          </PillButton>
          <GhostPill href="#/chatbots" size="md">
            see a live demo
          </GhostPill>
        </motion.div>

        <motion.div
          custom={4}
          variants={fadeUp}
          initial="hidden"
          animate="show"
          className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3"
        >
          {STATS.map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-2 text-sm text-zinc-600">
              <Icon className="h-4 w-4 text-ink/70" />
              <span className="lowercase">{label}</span>
            </div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
