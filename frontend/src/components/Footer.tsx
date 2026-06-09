import { Clover } from './icons'

const COLUMNS: { heading: string; links: string[] }[] = [
  { heading: 'product', links: ['chatbots', 'pricing', 'showcase'] },
  { heading: 'resources', links: ['docs', 'api', 'community'] },
  { heading: 'company', links: ['about', 'blog', 'careers'] },
  { heading: 'legal', links: ['privacy', 'terms'] },
]

export default function Footer() {
  return (
    <footer className="border-t border-black/[0.06] bg-bg-base">
      <div className="mx-auto grid max-w-7xl grid-cols-2 gap-10 px-6 py-14 md:grid-cols-6 md:px-12 lg:px-16">
        {/* Brand */}
        <div className="col-span-2">
          <a href="#/" className="flex items-center gap-2">
            <Clover className="h-5 w-5 text-ink" />
            <span className="font-display text-lg tracking-tight text-ink">SportNavi</span>
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
                <li key={link}>
                  <a
                    href="#/"
                    className="text-sm lowercase text-zinc-500 transition-colors hover:text-ink"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="border-t border-black/[0.05]">
        <div className="mx-auto max-w-7xl px-6 py-6 text-xs text-zinc-400 md:px-12 lg:px-16">
          © 2026 SportNavi. All rights reserved.
        </div>
      </div>
    </footer>
  )
}
