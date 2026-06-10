import { Clover } from './icons'

type FooterLink = { label: string; href: string; external?: boolean }

const COLUMNS: { heading: string; links: FooterLink[] }[] = [
  {
    heading: 'product',
    links: [
      { label: 'chatbots', href: '#/chatbots' },
      { label: 'live demo', href: '#/chatbots/navio' },
    ],
  },
  {
    heading: 'developers',
    links: [
      { label: 'documentation', href: '#/chatbots/navio' },
      { label: 'embed snippet', href: '#/chatbots/navio' },
      { label: 'github', href: 'https://github.com/AiLabSportnavi/DswgoNavioChatbot', external: true },
    ],
  },
  {
    heading: 'legal',
    links: [
      { label: 'datenschutz', href: 'https://www.sportnavi.de/datenschutz/', external: true },
      { label: 'sportnavi.de', href: 'https://www.sportnavi.de', external: true },
    ],
  },
]

export default function Footer() {
  return (
    <footer className="border-t border-black/[0.06] bg-bg-base">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-6 py-14 md:grid-cols-5 md:px-12 lg:px-16">
        {/* Brand */}
        <div className="col-span-2">
          <a href="#/" className="flex items-center gap-2">
            <Clover className="h-5 w-5 text-ink" />
            <span className="font-display text-lg tracking-tight text-ink">Sportnavi</span>
          </a>
          <p className="mt-3 max-w-xs text-sm text-zinc-500">
            The hub for embeddable AI chatbots on sportnavi.de.
          </p>
        </div>

        {/* Link columns */}
        {COLUMNS.map((col) => (
          <div key={col.heading}>
            <h4 className="text-xs font-semibold lowercase tracking-wide text-ink">{col.heading}</h4>
            <ul className="mt-4 space-y-2.5">
              {col.links.map((link) => (
                <li key={link.label}>
                  <a
                    href={link.href}
                    {...(link.external ? { target: '_blank', rel: 'noreferrer' } : {})}
                    className="text-sm lowercase text-zinc-500 transition-colors hover:text-ink"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-black/[0.05]">
        <div className="mx-auto max-w-7xl px-6 py-6 text-xs text-zinc-400 md:px-12 lg:px-16">
          © 2026 Sportnavi. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
