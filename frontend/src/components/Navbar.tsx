import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from '@clerk/clerk-react'
import PillButton from './PillButton'
import { Clover } from './icons'
import { navigate } from '../lib/router'

type NavLink = { label: string; to: string }

const NAV_LINKS: NavLink[] = [
  { label: 'chatbots', to: '/chatbots' },
]

export default function Navbar() {
  const [open, setOpen] = useState(false)

  const go = (to: string) => {
    setOpen(false)
    navigate(to)
  }

  return (
    <header className="fixed top-0 left-0 z-50 w-full bg-gradient-to-b from-bg-base/80 to-transparent py-5 backdrop-blur-[2px] md:py-7">
      <div className="mx-auto grid max-w-7xl grid-cols-12 items-center px-6 md:px-12 lg:px-16">
        {/* Brand */}
        <button
          type="button"
          onClick={() => go('/')}
          className="col-span-6 flex items-center gap-2 md:col-span-3"
        >
          <Clover className="h-5 w-5 text-ink" />
          <span className="font-display text-xl tracking-tight text-ink">Sportnavi</span>
        </button>

        {/* Center nav — desktop */}
        <nav className="hidden items-center justify-center gap-8 md:col-span-6 md:flex">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              type="button"
              onClick={() => go(link.to)}
              className="text-sm lowercase text-zinc-600 transition-colors hover:text-ink"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* Actions */}
        <div className="col-span-6 flex items-center justify-end gap-3 md:col-span-3 md:gap-5">
          {/* Signed-out: real Clerk sign-in / sign-up modals. Signed-in: account menu. */}
          <SignedOut>
            <SignInButton mode="modal">
              <button
                type="button"
                className="hidden text-sm lowercase text-zinc-600 transition-colors hover:text-ink sm:inline"
              >
                sign in
              </button>
            </SignInButton>
            <SignUpButton mode="modal">
              <PillButton className="hidden sm:inline-flex">sign up</PillButton>
            </SignUpButton>
          </SignedOut>
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>

          {/* Hamburger — mobile */}
          <button
            type="button"
            aria-label="Toggle menu"
            onClick={() => setOpen((v) => !v)}
            className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] md:hidden"
          >
            <motion.span
              animate={open ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.25 }}
              className="block h-[2px] w-5 rounded-full bg-ink"
            />
            <motion.span
              animate={open ? { opacity: 0 } : { opacity: 1 }}
              transition={{ duration: 0.25 }}
              className="block h-[2px] w-5 rounded-full bg-ink"
            />
            <motion.span
              animate={open ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
              transition={{ duration: 0.25 }}
              className="block h-[2px] w-5 rounded-full bg-ink"
            />
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="mx-4 mt-4 overflow-hidden rounded-2xl border border-black/[0.05] bg-white/80 backdrop-blur-md md:hidden"
          >
            <nav className="flex flex-col gap-4 p-6">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => go(link.to)}
                  className="text-left text-base lowercase text-zinc-700 transition-colors hover:text-ink"
                >
                  {link.label}
                </button>
              ))}
              <SignedOut>
                <SignInButton mode="modal">
                  <button
                    type="button"
                    className="text-left text-base lowercase text-zinc-700 transition-colors hover:text-ink"
                  >
                    sign in
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <PillButton className="mt-2 self-start">sign up</PillButton>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <div className="mt-1 flex items-center gap-3">
                  <UserButton afterSignOutUrl="/" />
                  <span className="text-sm lowercase text-zinc-600">account</span>
                </div>
              </SignedIn>
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  )
}
