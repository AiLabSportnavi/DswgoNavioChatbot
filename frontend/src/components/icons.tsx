import type { SVGProps } from 'react'

/** Shared base: 24×24, stroke-based, inherits color. */
function Svg({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

/** Geometric four-petal clover — the Sportnavi brand mark (filled). */
export function Clover({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2c1.66 0 3 1.34 3 3 0 .55-.15 1.06-.4 1.5.44-.25.95-.4 1.5-.4 1.66 0 3 1.34 3 3s-1.34 3-3 3c-.55 0-1.06-.15-1.5-.4.25.44.4.95.4 1.5 0 1.66-1.34 3-3 3s-3-1.34-3-3c0-.55.15-1.06.4-1.5-.44.25-.95.4-1.5.4-1.66 0-3-1.34-3-3s1.34-3 3-3c.55 0 1.06.15 1.5.4-.25-.44-.4-.95-.4-1.5 0-1.66 1.34-3 3-3z" />
    </svg>
  )
}

export function ArrowRight(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" />
    </Svg>
  )
}

export function Plus(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  )
}

export function Search(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="M21 21l-4.3-4.3" />
    </Svg>
  )
}

export function Bot(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="4" y="8" width="16" height="11" rx="3" />
      <path d="M12 8V4M9 4h6" />
      <circle cx="9" cy="13" r="1" fill="currentColor" stroke="none" />
      <circle cx="15" cy="13" r="1" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function Mic(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
    </Svg>
  )
}

export function Help(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.2 9a2.8 2.8 0 0 1 5.4 1c0 1.8-2.6 2.2-2.6 4" />
      <circle cx="12" cy="17.5" r="0.6" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function Calendar(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="3.5" y="5" width="17" height="16" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </Svg>
  )
}

export function TrendUp(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M3 17l6-6 4 4 7-7" />
      <path d="M14 8h6v6" />
    </Svg>
  )
}

export function Briefcase(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="3" y="7" width="18" height="13" rx="2.5" />
      <path d="M8 7V5.5A2.5 2.5 0 0 1 10.5 3h3A2.5 2.5 0 0 1 16 5.5V7M3 12h18" />
    </Svg>
  )
}

export function Chat(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M4 5h16a1 1 0 0 1 1 1v9a1 1 0 0 1-1 1H9l-4 4V6a1 1 0 0 1 1-1z" />
    </Svg>
  )
}

export function MessageSquare(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M21 14a2 2 0 0 1-2 2H8l-4 4V6a2 2 0 0 1 2-2h13a2 2 0 0 1 2 2z" />
    </Svg>
  )
}

export function Code(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M9 8l-4 4 4 4M15 8l4 4-4 4" />
    </Svg>
  )
}

export function Globe(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18M12 3c2.5 2.5 2.5 15 0 18M12 3c-2.5 2.5-2.5 15 0 18" />
    </Svg>
  )
}

export function Copy(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="9" y="9" width="11" height="11" rx="2.5" />
      <path d="M5 15H4.5A1.5 1.5 0 0 1 3 13.5v-9A1.5 1.5 0 0 1 4.5 3h9A1.5 1.5 0 0 1 15 4.5V5" />
    </Svg>
  )
}

export function Bolt(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z" />
    </Svg>
  )
}

export function ArrowLeft(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M19 12H5" />
      <path d="M11 6l-6 6 6 6" />
    </Svg>
  )
}

export function ChevronUp(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M6 15l6-6 6 6" />
    </Svg>
  )
}

export function ChevronDown(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  )
}

export function Check(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M5 12l5 5L20 7" />
    </Svg>
  )
}

export function Star(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M12 3l2.6 5.6 6.1.8-4.5 4.2 1.2 6L12 17.8 6.6 19.6l1.2-6L3.3 9.4l6.1-.8z" />
    </Svg>
  )
}

/** GitHub mark (filled). */
export function Github({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2C6.48 2 2 6.58 2 12.25c0 4.53 2.87 8.37 6.84 9.73.5.1.68-.22.68-.49 0-.24-.01-.88-.01-1.73-2.78.62-3.37-1.37-3.37-1.37-.45-1.18-1.11-1.5-1.11-1.5-.91-.64.07-.62.07-.62 1 .07 1.53 1.06 1.53 1.06.89 1.56 2.34 1.11 2.91.85.09-.66.35-1.11.63-1.37-2.22-.26-4.56-1.14-4.56-5.07 0-1.12.39-2.03 1.03-2.75-.1-.26-.45-1.3.1-2.71 0 0 .84-.28 2.75 1.05a9.36 9.36 0 0 1 5 0c1.91-1.33 2.75-1.05 2.75-1.05.55 1.41.2 2.45.1 2.71.64.72 1.03 1.63 1.03 2.75 0 3.94-2.34 4.81-4.57 5.06.36.32.68.94.68 1.9 0 1.37-.01 2.48-.01 2.82 0 .27.18.6.69.49A10.26 10.26 0 0 0 22 12.25C22 6.58 17.52 2 12 2z" />
    </svg>
  )
}

export function Users(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
      <path d="M16 5.2a3.2 3.2 0 0 1 0 6.1M17 13.6a5.5 5.5 0 0 1 3.5 5.1" />
    </Svg>
  )
}

export function CreditCard(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3 10h18M7 15h4" />
    </Svg>
  )
}

export function Compass(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M15.5 8.5l-2 5-5 2 2-5z" />
    </Svg>
  )
}

export function Sparkles(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M12 3l1.7 4.3L18 9l-4.3 1.7L12 15l-1.7-4.3L6 9l4.3-1.7z" />
      <path d="M18 14l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8z" />
    </Svg>
  )
}

export function Clock(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.5 2" />
    </Svg>
  )
}

export function Info(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5" />
      <circle cx="12" cy="8" r="0.6" fill="currentColor" stroke="none" />
    </Svg>
  )
}

export function Refresh(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M20 11a8 8 0 1 0-.9 4.5" />
      <path d="M20 5v6h-6" />
    </Svg>
  )
}

export function Lock(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="5" y="11" width="14" height="9" rx="2.5" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </Svg>
  )
}

export function Send(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M4 12l16-7-7 16-2.5-6.5z" />
    </Svg>
  )
}

export function Close(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  )
}

export function Sun(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19" />
    </Svg>
  )
}

export function Moon(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </Svg>
  )
}

export function Mail(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2.5" />
      <path d="M3.5 7l8.5 6 8.5-6" />
    </Svg>
  )
}

export function Document(props: SVGProps<SVGSVGElement>) {
  return (
    <Svg {...props}>
      <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" />
      <path d="M14 3v5h5M9 13h6M9 17h6M9 9h1" />
    </Svg>
  )
}
