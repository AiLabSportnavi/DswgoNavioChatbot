// Widget design variants — built only from the official Sportnavi palette
// (green #95c11e, orange #ec6607, black, white) plus neutral grays.

export type WidgetVariant = 'classic' | 'dark' | 'minimal' | 'gradient'

export type WidgetTheme = {
  /** header background + text color */
  header: string
  /** round header icon buttons (info / reset / close) */
  headerBtn: string
  /** avatar circle */
  avatar: string
  /** "online" status dot */
  onlineDot: string
  /** outgoing (user) chat bubble */
  userBubble: string
  /** primary action color — send button + "Zustimmen" */
  primary: string
  /** input focus ring */
  ring: string
  /** floating launcher (used by ChatWidget) */
  fab: string
}

export const WIDGET_THEMES: Record<WidgetVariant, WidgetTheme> = {
  classic: {
    header: 'bg-brand-green text-white',
    headerBtn: 'bg-white/15 hover:bg-white/30 text-white',
    avatar: 'bg-white text-brand-green',
    onlineDot: 'bg-white',
    userBubble: 'bg-ink text-white',
    primary: 'bg-brand-green text-white',
    ring: 'focus:ring-brand-green/40',
    fab: 'bg-ink text-brand-green',
  },
  dark: {
    header: 'bg-black text-white',
    headerBtn: 'bg-white/10 hover:bg-white/25 text-white',
    avatar: 'bg-brand-green text-black',
    onlineDot: 'bg-brand-green',
    userBubble: 'bg-brand-green text-black',
    primary: 'bg-brand-green text-black',
    ring: 'focus:ring-brand-green/40',
    fab: 'bg-black text-brand-green',
  },
  minimal: {
    header: 'bg-white text-ink border-b-2 border-brand-green',
    headerBtn: 'bg-ink/5 hover:bg-ink/10 text-ink',
    avatar: 'bg-brand-green/15 text-ink',
    onlineDot: 'bg-brand-green',
    userBubble: 'bg-ink text-white',
    primary: 'bg-brand-green text-black',
    ring: 'focus:ring-brand-green/40',
    fab: 'bg-white text-brand-green border border-black/10',
  },
  gradient: {
    header: 'bg-gradient-to-r from-brand-green to-brand-orange text-white',
    headerBtn: 'bg-white/20 hover:bg-white/35 text-white',
    avatar: 'bg-white text-brand-orange',
    onlineDot: 'bg-white',
    userBubble: 'bg-ink text-white',
    primary: 'bg-brand-orange text-white',
    ring: 'focus:ring-brand-orange/40',
    fab: 'bg-gradient-to-br from-brand-green to-brand-orange text-white',
  },
}

export const WIDGET_VARIANTS: { id: WidgetVariant; label: string; desc: string }[] = [
  { id: 'classic', label: 'Classic', desc: 'Sportnavi green' },
  { id: 'dark', label: 'Dark', desc: 'Black + green' },
  { id: 'minimal', label: 'Minimal', desc: 'White + green' },
  { id: 'gradient', label: 'Gradient', desc: 'Green → orange' },
]

export function isWidgetVariant(v: string | null | undefined): v is WidgetVariant {
  return v === 'classic' || v === 'dark' || v === 'minimal' || v === 'gradient'
}
