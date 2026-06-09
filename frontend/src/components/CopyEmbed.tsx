import { useState } from 'react'
import { Copy, Check } from './icons'

type CopyEmbedProps = {
  code: string
  variant?: 'sidebar' | 'full'
}

/** Dark code block with a one-tap copy button + "copied" feedback. */
export default function CopyEmbed({ code, variant = 'full' }: CopyEmbedProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      // clipboard blocked (e.g. insecure context) — no-op
    }
  }

  if (variant === 'sidebar') {
    return (
      <div className="flex items-center gap-2 rounded-xl bg-ink p-2 pl-3">
        <code className="flex-1 truncate font-mono text-[11px] text-zinc-300">{code}</code>
        <button
          type="button"
          onClick={copy}
          aria-label="Copy embed snippet"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-brand-green text-black transition-transform hover:scale-105"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        </button>
      </div>
    )
  }

  return (
    <div className="relative overflow-hidden rounded-2xl bg-ink soft-shadow">
      <div className="flex items-center justify-between border-b border-white/10 px-5 py-3">
        <span className="font-mono text-xs lowercase tracking-wide text-zinc-400">embed.html</span>
        <button
          type="button"
          onClick={copy}
          className="inline-flex items-center gap-1.5 rounded-full bg-brand-green px-3 py-1 text-xs lowercase text-black transition-transform hover:scale-105"
        >
          {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
          {copied ? 'copied' : 'copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-5 py-4">
        <code className="font-mono text-sm leading-relaxed text-zinc-100">{code}</code>
      </pre>
    </div>
  )
}
