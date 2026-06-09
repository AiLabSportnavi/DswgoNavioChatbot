import type { ReactNode } from 'react'
import { motion } from 'motion/react'
import { ArrowRight } from './icons'

type PillButtonProps = {
  children: ReactNode
  /** Hash route or url. If omitted, renders a <button>. */
  href?: string
  onClick?: () => void
  /** Content of the lime circular chip. Defaults to an arrow; pass null to hide. */
  chip?: ReactNode
  size?: 'sm' | 'md'
  className?: string
}

/**
 * Dark ink pill with a brand-green chip and a hover sheen sweep.
 * The primary action across the hub (get started / explore / embed / new chatbot).
 */
export default function PillButton({
  children,
  href,
  onClick,
  chip = <ArrowRight className="h-3.5 w-3.5" />,
  size = 'sm',
  className = '',
}: PillButtonProps) {
  const pad = size === 'md' ? 'pl-6 pr-2 py-2 text-[15px]' : 'pl-5 pr-1.5 py-1.5 text-sm'
  const chipSize = size === 'md' ? 'h-8 w-8' : 'h-7 w-7'

  const content = (
    <>
      {/* brand-green sheen sweep on hover */}
      <motion.span
        aria-hidden="true"
        variants={{ rest: { x: '-120%' }, hover: { x: '120%' } }}
        transition={{ duration: 0.7, ease: 'easeInOut' }}
        className="pointer-events-none absolute inset-0 -skew-x-12 bg-gradient-to-r from-transparent via-brand-green/25 to-transparent"
      />
      <span className="relative z-10 lowercase tracking-wide">{children}</span>
      {chip && (
        <motion.span
          variants={{ rest: { x: 0 }, hover: { x: 2 } }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          className={`relative z-10 flex ${chipSize} items-center justify-center rounded-full bg-brand-green text-black`}
        >
          {chip}
        </motion.span>
      )}
    </>
  )

  const shared = `group relative inline-flex items-center gap-2 overflow-hidden rounded-full bg-ink ${pad} text-white shadow-[0_4px_20px_-6px_rgba(0,0,0,0.5)] transition-shadow duration-300 hover:shadow-[0_8px_30px_-6px_rgba(159,255,0,0.55)] ${className}`

  if (href) {
    return (
      <motion.a
        href={href}
        onClick={onClick}
        whileHover="hover"
        whileTap={{ scale: 0.96 }}
        initial="rest"
        animate="rest"
        className={shared}
      >
        {content}
      </motion.a>
    )
  }

  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover="hover"
      whileTap={{ scale: 0.96 }}
      initial="rest"
      animate="rest"
      className={shared}
    >
      {content}
    </motion.button>
  )
}
