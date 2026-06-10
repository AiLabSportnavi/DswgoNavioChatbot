import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

/**
 * Renders Navio's replies as formatted markdown inside a chat bubble.
 *
 * The model answers in markdown (bold, links, numbered/bulleted lists, tables),
 * which would otherwise show as raw `**`/`[text](url)`/`| a | b |` text. Tailwind's
 * preflight strips list, link and table styling, so every element is restyled here.
 *
 * NOTE: we intentionally do NOT use remark-breaks — it turns every newline into a
 * hard break, which stops remark-gfm from parsing tables (they render as raw pipes).
 * Paragraphs separate on blank lines, which is how the model formats replies.
 */
export default function Markdown({ children }: { children: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed [&_a]:break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          a: ({ ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-brand-green underline underline-offset-2 hover:text-ink"
            />
          ),
          ul: ({ ...props }) => <ul {...props} className="list-disc space-y-1 pl-5" />,
          ol: ({ ...props }) => <ol {...props} className="list-decimal space-y-1 pl-5" />,
          li: ({ ...props }) => <li {...props} className="marker:text-zinc-400" />,
          strong: ({ ...props }) => <strong {...props} className="font-semibold text-ink" />,
          code: ({ ...props }) => (
            <code {...props} className="rounded bg-black/[0.06] px-1 py-0.5 text-[0.85em]" />
          ),
          // Tables: keep them inside the bubble — scroll horizontally if too wide
          // for the chat instead of overflowing the widget.
          table: ({ ...props }) => (
            <div className="my-1 max-w-full overflow-x-auto rounded-lg border border-black/10">
              <table {...props} className="w-full border-collapse text-xs" />
            </div>
          ),
          thead: ({ ...props }) => <thead {...props} className="bg-black/[0.04]" />,
          th: ({ ...props }) => (
            <th
              {...props}
              className="border-b border-black/10 px-2 py-1.5 text-left align-top font-semibold text-ink"
            />
          ),
          td: ({ ...props }) => (
            <td {...props} className="border-b border-black/[0.06] px-2 py-1.5 align-top" />
          ),
          h1: ({ ...props }) => <p {...props} className="font-semibold text-ink" />,
          h2: ({ ...props }) => <p {...props} className="font-semibold text-ink" />,
          h3: ({ ...props }) => <p {...props} className="font-semibold text-ink" />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
