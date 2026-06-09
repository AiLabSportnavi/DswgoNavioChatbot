import { createRoot } from 'react-dom/client'
import ChatWidget from '../components/ChatWidget'
import { setApiBase } from '../lib/api'
import css from '../index.css?inline'

// Capture the <script> tag synchronously (currentScript is null later / in callbacks).
const SCRIPT =
  (document.currentScript as HTMLScriptElement | null) ??
  document.querySelector<HTMLScriptElement>('script[data-api]')

const FONTS_HREF =
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Outfit:wght@300;400;500;600;700&display=swap'

function mount() {
  if (document.getElementById('navio-widget-host')) return // guard against double-load

  const apiBase = SCRIPT?.getAttribute('data-api') ?? ''
  const policyUrl = SCRIPT?.getAttribute('data-policy-url') ?? undefined
  if (apiBase) setApiBase(apiBase)

  // Fonts are registered at the document level so they cascade into the shadow root.
  if (!document.getElementById('navio-fonts')) {
    const link = document.createElement('link')
    link.id = 'navio-fonts'
    link.rel = 'stylesheet'
    link.href = FONTS_HREF
    document.head.appendChild(link)
  }

  // Sealed container — the host site's CSS can't reach in, ours can't leak out.
  const host = document.createElement('div')
  host.id = 'navio-widget-host'
  host.style.cssText = 'position:fixed;inset:0;z-index:2147483000;pointer-events:none;'
  document.body.appendChild(host)

  const shadow = host.attachShadow({ mode: 'open' })

  const style = document.createElement('style')
  const cleaned = css
    // Drop the Google-Fonts @import (loaded via the document <link> above). The URL
    // contains ';', so match the whole url(...) — a greedy [^;] regex corrupts the CSS.
    .replace(/@import\s+url\([^)]*\)\s*;?/g, '')
    // Tailwind emits theme vars on :root, which doesn't exist in a shadow root —
    // remap them to :host so var(--color-*) resolves inside the widget.
    .replace(/:root\b/g, ':host')
  // Base font/color on the host blocks the page's inherited typography from leaking in.
  style.textContent =
    ":host{display:block;font-family:'Inter',ui-sans-serif,system-ui,sans-serif;" +
    'color:#1a1a1a;line-height:1.5;-webkit-font-smoothing:antialiased}\n' +
    cleaned
  shadow.appendChild(style)

  const mountEl = document.createElement('div')
  // The fixed launcher/panel live here; re-enable pointer events for the widget only.
  mountEl.style.pointerEvents = 'auto'
  shadow.appendChild(mountEl)

  createRoot(mountEl).render(<ChatWidget policyUrl={policyUrl} />)
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mount)
} else {
  mount()
}
