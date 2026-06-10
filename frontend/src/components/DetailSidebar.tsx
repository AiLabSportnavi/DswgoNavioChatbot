import CopyEmbed from './CopyEmbed'
import { ArrowLeft, Clover, Github } from './icons'
import { navigate } from '../lib/router'
import type { Chatbot } from '../data/bots'

export type Slide = { id: string; label: string }

type DetailSidebarProps = {
  bot: Chatbot
  slides: Slide[]
  activeId: string
  onNavigate: (id: string) => void
  endpoint: string
}

export default function DetailSidebar({
  bot,
  slides,
  activeId,
  onNavigate,
  endpoint,
}: DetailSidebarProps) {
  const offline = bot.status === 'offline'

  return (
    <aside className="flex h-screen w-[300px] shrink-0 flex-col gap-7 overflow-y-auto border-r border-black/[0.06] bg-white px-6 py-7">
      {/* back */}
      <button
        type="button"
        onClick={() => navigate('/chatbots')}
        className="flex items-center gap-2 text-sm lowercase text-zinc-500 transition-colors hover:text-ink"
      >
        <ArrowLeft className="h-4 w-4" />
        back to chatbots
      </button>

      {/* identity */}
      <div>
        <div className="flex items-center gap-2">
          <Clover className="h-4 w-4 text-ink" />
          <span className="font-display text-sm tracking-tight text-ink">Sportnavi</span>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-green/15 text-ink">
            <bot.icon className="h-6 w-6" />
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-lg font-semibold tracking-tight text-ink">
                {bot.name}
              </h2>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] lowercase ${
                  offline ? 'bg-zinc-100 text-zinc-400' : 'bg-brand-green/15 text-ink'
                }`}
              >
                <span className={`h-1.5 w-1.5 rounded-full ${offline ? 'bg-zinc-300' : 'bg-brand-green'}`} />
                {bot.status}
              </span>
            </div>
            <p className="text-xs lowercase text-zinc-500">{bot.role}</p>
          </div>
        </div>
      </div>

      {/* slide navigator */}
      <nav className="flex flex-col gap-1">
        {slides.map((s) => {
          const on = s.id === activeId
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onNavigate(s.id)}
              className={`group relative flex items-center rounded-lg px-3 py-2 text-sm lowercase transition-colors ${
                on ? 'bg-bg-base text-ink' : 'text-zinc-500 hover:text-ink'
              }`}
            >
              <span
                className={`absolute left-0 h-4 w-1 rounded-full bg-brand-green transition-opacity ${
                  on ? 'opacity-100' : 'opacity-0'
                }`}
              />
              {s.label}
            </button>
          )
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-5">
        {/* github card */}
        <a
          href={bot.repo.url}
          target="_blank"
          rel="noreferrer"
          className="block rounded-2xl border border-black/[0.07] bg-bg-base/60 p-4 transition-colors hover:border-ink/20"
        >
          <div className="flex items-center gap-2">
            <Github className="h-4 w-4 text-ink" />
            <span className="truncate font-mono text-xs text-ink">{bot.repo.name}</span>
          </div>
          <div className="mt-3 flex items-center gap-2 text-[11px] text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-brand-green" />
              {bot.repo.language}
            </span>
            <span>· open source</span>
          </div>
          <span className="mt-3 inline-flex w-full items-center justify-center rounded-full border border-ink/15 bg-white px-3 py-1.5 text-xs lowercase text-ink transition-colors group-hover:border-ink/40">
            view on github
          </span>
        </a>

        {/* live endpoint */}
        <div>
          <p className="mb-2 text-xs lowercase tracking-wide text-zinc-500">chat endpoint</p>
          <CopyEmbed variant="sidebar" code={endpoint} />
        </div>
      </div>
    </aside>
  )
}
