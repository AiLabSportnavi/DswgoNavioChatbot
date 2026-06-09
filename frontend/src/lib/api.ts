/**
 * Navio chat API client — talks to the FastAPI backend's POST /api/chat.
 *
 * In dev the request is relative (`/api/chat`) and Vite proxies it to the
 * backend (see vite.config.ts), so there is no CORS. In production set
 * VITE_NAVIO_API to the backend origin (e.g. https://navio.sportnavi.de).
 */
let API_BASE = (import.meta.env.VITE_NAVIO_API as string | undefined) ?? ''

/** Point the client at a backend at runtime (used by the embeddable widget). */
export function setApiBase(url: string) {
  API_BASE = url.replace(/\/+$/, '')
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

/** Backend caps: MAX_MESSAGE_CHARS=2000, MAX_HISTORY_TURNS=10. */
export const MAX_MESSAGE_CHARS = 2000
const MAX_HISTORY_TURNS = 10

export async function sendChat(
  message: string,
  history: ChatTurn[],
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message.slice(0, MAX_MESSAGE_CHARS),
      history: history.slice(-MAX_HISTORY_TURNS),
    }),
    signal,
  })

  if (!res.ok) {
    const detail = await res
      .json()
      .then((d: { detail?: string }) => d?.detail)
      .catch(() => undefined)
    if (res.status === 429) {
      throw new Error(detail ?? 'Too many requests — please slow down.')
    }
    throw new Error(detail ?? `Navio is unavailable right now (${res.status}).`)
  }

  const data = (await res.json()) as { reply: string }
  return data.reply
}

export type NavioConfig = {
  system_prompt: string
  datenschutz: string
  admin_required: boolean
}

export async function getConfig(signal?: AbortSignal): Promise<NavioConfig> {
  const res = await fetch(`${API_BASE}/api/config`, { signal })
  if (!res.ok) throw new Error(`Config unavailable (${res.status}).`)
  return (await res.json()) as NavioConfig
}

async function postConfig(path: string, content: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content }),
  })
  if (!res.ok) {
    const detail = await res
      .json()
      .then((d: { detail?: string }) => d?.detail)
      .catch(() => undefined)
    throw new Error(detail ?? `Save failed (${res.status}).`)
  }
}

export const saveSystemPrompt = (content: string) =>
  postConfig('/api/config/system-prompt', content)
export const saveDatenschutz = (content: string) =>
  postConfig('/api/config/datenschutz', content)
