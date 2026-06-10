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

export type SendChatOptions = {
  signal?: AbortSignal
}

/** A chat reply from the backend. */
export type ChatReply = { reply: string }

export async function sendChat(
  message: string,
  history: ChatTurn[],
  opts: SendChatOptions = {},
): Promise<ChatReply> {
  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: message.slice(0, MAX_MESSAGE_CHARS),
      history: history.slice(-MAX_HISTORY_TURNS),
      // The widget only calls this after the Datenschutz gate is accepted, so the
      // backend records consent and may store the message text in its log.
      consent: true,
    }),
    signal: opts.signal,
  })

  if (!res.ok) {
    // FastAPI 422 returns detail as an array of objects — only use it if it's a
    // string, otherwise fall back to a readable message (never "[object Object]").
    const detail = await res
      .json()
      .then((d: { detail?: unknown }) => (typeof d?.detail === 'string' ? d.detail : undefined))
      .catch(() => undefined)
    if (res.status === 429) {
      throw new Error(detail ?? 'Too many requests — please slow down.')
    }
    throw new Error(detail ?? `Navio is unavailable right now (${res.status}).`)
  }

  const data = (await res.json()) as { reply: string }
  return { reply: data.reply }
}

export type NavioConfig = {
  system_prompt: string
  admin_required: boolean
}

export async function getConfig(signal?: AbortSignal): Promise<NavioConfig> {
  const res = await fetch(`${API_BASE}/api/config`, { signal })
  if (!res.ok) throw new Error(`Config unavailable (${res.status}).`)
  return (await res.json()) as NavioConfig
}

async function postConfig(path: string, content: string, token?: string | null): Promise<void> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  // Clerk session JWT — the backend verifies it and checks the email domain.
  if (token) headers.Authorization = `Bearer ${token}`
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ content }),
  })
  if (!res.ok) {
    const detail = await res
      .json()
      .then((d: { detail?: string }) => d?.detail)
      .catch(() => undefined)
    if (res.status === 401) throw new Error(detail ?? 'Please sign in to save.')
    if (res.status === 403) throw new Error(detail ?? 'This account is not authorized to edit.')
    throw new Error(detail ?? `Save failed (${res.status}).`)
  }
}

/** Save the system prompt. Pass the Clerk session token (from `getToken()`). */
export const saveSystemPrompt = (content: string, token?: string | null) =>
  postConfig('/api/config/system-prompt', content, token)
