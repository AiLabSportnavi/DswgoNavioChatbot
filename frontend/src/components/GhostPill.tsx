import type { ReactNode } from 'react'
import { motion } from 'motion/react'

type GhostPillProps = {
  children: ReactNode
  href?: string
  onClick?: () => void
  leading?: ReactNode
  trailing?: ReactNode
  size?: 'sm' | 'md'
  className?: string
}

/** Outline / ghost pill — the secondary action (see a live demo / preview). */
export default function GhostPill({
  children,
  href,
  onClick,
  leading,
  trailing,
  size = 'sm',
  className = '',
}: GhostPillProps) {
  const pad = size === 'md' ? 'px-6 py-2 text-[15px]' : 'px-5 py-1.5 text-sm'
  const shared = `group inline-flex items-center justify-center gap-2 rounded-full border border-ink/15 bg-white/60 ${pad} lowercase tracking-wide text-ink backdrop-blur-sm transition-colors duration-200 hover:border-ink/40 hover:bg-white ${className}`

  const content = (
    <>
      {leading}
      <span>{children}</span>
      {trailing}
    </>
  )

  if (href) {
    return (
      <motion.a href={href} onClick={onClick} whileTap={{ scale: 0.97 }} className={shared}>
        {content}
      </motion.a>
    )
  }

  return (
    <motion.button type="button" onClick={onClick} whileTap={{ scale: 0.97 }} className={shared}>
      {content}
    </motion.button>
  )
}
