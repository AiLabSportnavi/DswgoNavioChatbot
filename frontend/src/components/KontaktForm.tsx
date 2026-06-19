import { useState, type FormEvent, type ReactNode } from 'react'
import { motion } from 'motion/react'
import { Check, ChevronDown, Send } from './icons'
import { submitContact, type ContactPayload } from '../lib/api'
import type { Chatbot } from '../data/bots'
import {
  MEMBERSHIP_TYPES,
  CASE_GROUNDS_BY_MEMBERSHIP,
  TOPICS_BY_CASEGROUND,
  SHORT_DESCRIPTIONS_BY_TOPIC,
  type SalesforceOption,
} from '../data/salesforceOptions'

/* Modern, on-brand rebuild of the Sportnavi Kontakt form — same fields as the
 * live page, restyled to match the Navio widget. Submission goes through
 * lib/api.ts → submitContact → backend POST /api/contact → Salesforce CaseHandler. */

type FormState = {
  membership: string
  grund: string
  thema: string
  kurzbeschreibung: string
  betreff: string
  name: string
  email: string
  telefon: string
  kundennummer: string
  nachricht: string
  agbDatenschutz: boolean
  widerruf: boolean
}

const EMPTY: FormState = {
  membership: '',
  grund: '',
  thema: '',
  kurzbeschreibung: '',
  betreff: '',
  name: '',
  email: '',
  telefon: '',
  kundennummer: '',
  nachricht: '',
  agbDatenschutz: false,
  widerruf: false,
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block font-display text-[13px] font-medium text-ink">
      {children}
      {required && <span className="text-brand-orange"> *</span>}
    </label>
  )
}

const fieldBase =
  'w-full rounded-xl border bg-bg-base px-3.5 py-2.5 text-sm text-ink placeholder:text-zinc-400 transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green/40'

export default function KontaktForm({
  bot,
  onBack,
  privacyUrl,
}: {
  bot: Chatbot
  onBack: () => void
  privacyUrl?: string
}) {
  const policyUrl = privacyUrl ?? bot.privacy.url
  const widerrufUrl = bot.kontakt?.widerrufUrl ?? 'https://www.sportnavi.de/widerrufsbelehrung/'

  const [f, setF] = useState<FormState>(EMPTY)
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, boolean>>>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [done, setDone] = useState(false)

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setF((prev) => ({ ...prev, [key]: value }))
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: false }))
  }

  // The four picklists CASCADE in Salesforce (Membership → Grund → Thema →
  // Kurzbeschreibung). Picking a parent resets the children so an invalid combo —
  // which the CaseHandler flow rejects — can never be submitted.
  const selectMembership = (v: string) => {
    setF((prev) => ({ ...prev, membership: v, grund: '', thema: '', kurzbeschreibung: '' }))
    setErrors((prev) => ({ ...prev, membership: false }))
  }
  const selectGrund = (v: string) => {
    setF((prev) => ({ ...prev, grund: v, thema: '', kurzbeschreibung: '' }))
    setErrors((prev) => ({ ...prev, grund: false }))
  }
  const selectThema = (v: string) => {
    setF((prev) => ({ ...prev, thema: v, kurzbeschreibung: '' }))
    setErrors((prev) => ({ ...prev, thema: false }))
  }

  // Dependent option lists — empty until the parent is chosen.
  const grundOptions = f.membership ? CASE_GROUNDS_BY_MEMBERSHIP[f.membership] ?? [] : []
  const themaOptions = f.grund ? TOPICS_BY_CASEGROUND[f.grund] ?? [] : []
  const kurzOptions = f.thema ? SHORT_DESCRIPTIONS_BY_TOPIC[f.thema] ?? [] : []

  const validate = (): boolean => {
    const e: Partial<Record<keyof FormState, boolean>> = {}
    if (!f.membership) e.membership = true
    if (!f.grund) e.grund = true
    if (!f.thema) e.thema = true
    if (!f.kurzbeschreibung.trim()) e.kurzbeschreibung = true
    if (!f.betreff.trim()) e.betreff = true
    if (!f.name.trim()) e.name = true
    if (!EMAIL_RE.test(f.email)) e.email = true
    if (!f.nachricht.trim()) e.nachricht = true
    if (!f.agbDatenschutz) e.agbDatenschutz = true
    if (!f.widerruf) e.widerruf = true
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev: FormEvent) => {
    ev.preventDefault()
    setSubmitError(null)
    if (!validate()) {
      setSubmitError('Bitte fülle die markierten Pflichtfelder aus.')
      return
    }
    const payload: ContactPayload = {
      membership: f.membership,
      grund: f.grund,
      thema: f.thema,
      kurzbeschreibung: f.kurzbeschreibung.trim(),
      betreff: f.betreff.trim(),
      name: f.name.trim(),
      email: f.email.trim(),
      telefon: f.telefon.trim() || undefined,
      kundennummer: f.kundennummer.trim() || undefined,
      nachricht: f.nachricht.trim(),
    }
    setSending(true)
    try {
      await submitContact(payload)
      setDone(true)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Senden fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setSending(false)
    }
  }

  /* ── success state ──────────────────────────────────────────────────── */
  if (done) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <motion.span
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 16 }}
          className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-green/15 text-brand-green"
        >
          <Check className="h-8 w-8" />
        </motion.span>
        <h3 className="mt-5 font-display text-xl font-semibold text-ink">Danke, {f.name.split(' ')[0] || 'dir'}! 🎉</h3>
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-zinc-600">
          Deine Nachricht ist bei uns eingegangen. Unser Team meldet sich zeitnah bei dir –
          in der Regel innerhalb von 1–2 Werktagen.
        </p>
        <div className="mt-6 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              setF(EMPTY)
              setDone(false)
            }}
            className="rounded-full bg-brand-green px-5 py-2 text-sm font-medium text-white transition-transform hover:scale-[1.02]"
          >
            Neue Anfrage senden
          </button>
          <button
            type="button"
            onClick={onBack}
            className="rounded-full px-5 py-2 text-sm text-zinc-500 transition-colors hover:text-ink"
          >
            Zurück zum Menü
          </button>
        </div>
      </div>
    )
  }

  /* ── form ───────────────────────────────────────────────────────────── */
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <form onSubmit={handleSubmit} className="flex-1 space-y-5 overflow-y-auto px-4 py-4" noValidate>
        <p className="text-sm leading-relaxed text-zinc-600">
          Du hast Fragen oder willst direkt loslegen? Schreib uns – wir helfen dir gerne weiter.
        </p>

        {/* Art der Mitgliedschaft — segmented */}
        <div>
          <Label required>Art der Mitgliedschaft</Label>
          <div className="grid grid-cols-3 gap-2">
            {MEMBERSHIP_TYPES.map((m) => {
              const active = f.membership === m.value
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => selectMembership(m.value)}
                  className={`rounded-xl border px-2 py-2 text-xs font-medium transition-colors ${
                    active
                      ? 'border-brand-green bg-brand-green/10 text-ink'
                      : errors.membership
                        ? 'border-brand-orange/60 bg-white text-zinc-600'
                        : 'border-black/[0.1] bg-white text-zinc-600 hover:border-ink/30'
                  }`}
                >
                  {m.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Grund + Thema selects (cascade from Mitgliedschaft) */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label required>Grund der Anfrage</Label>
            <Select
              value={f.grund}
              onChange={selectGrund}
              options={grundOptions}
              placeholder={f.membership ? 'Bitte wählen' : 'Erst Mitgliedschaft wählen'}
              disabled={!f.membership}
              error={!!errors.grund}
            />
          </div>
          <div>
            <Label required>Thema</Label>
            <Select
              value={f.thema}
              onChange={selectThema}
              options={themaOptions}
              placeholder={f.grund ? 'Bitte wählen' : 'Erst Grund wählen'}
              disabled={!f.grund}
              error={!!errors.thema}
            />
          </div>
        </div>

        <div>
          <Label required>Kurzbeschreibung</Label>
          <Select
            value={f.kurzbeschreibung}
            onChange={(v) => set('kurzbeschreibung', v)}
            options={kurzOptions}
            placeholder={f.thema ? 'Bitte wählen' : 'Erst Thema wählen'}
            disabled={!f.thema}
            error={!!errors.kurzbeschreibung}
          />
        </div>

        <div>
          <Label required>Betreff</Label>
          <input
            type="text"
            value={f.betreff}
            onChange={(e) => set('betreff', e.target.value)}
            placeholder="Betreff deiner Nachricht"
            className={`${fieldBase} ${errors.betreff ? 'border-brand-orange/60' : 'border-black/[0.08]'}`}
          />
        </div>

        <div>
          <Label required>Name</Label>
          <input
            type="text"
            value={f.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Vor- und Nachname"
            autoComplete="name"
            className={`${fieldBase} ${errors.name ? 'border-brand-orange/60' : 'border-black/[0.08]'}`}
          />
        </div>

        <div>
          <Label required>E-Mail Adresse</Label>
          <input
            type="email"
            value={f.email}
            onChange={(e) => set('email', e.target.value)}
            placeholder="name@beispiel.de"
            autoComplete="email"
            className={`${fieldBase} ${errors.email ? 'border-brand-orange/60' : 'border-black/[0.08]'}`}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <Label>Telefonnummer</Label>
            <input
              type="tel"
              value={f.telefon}
              onChange={(e) => set('telefon', e.target.value)}
              placeholder="Optional"
              autoComplete="tel"
              className={`${fieldBase} border-black/[0.08]`}
            />
          </div>
          <div>
            <Label>Kundennummer</Label>
            <input
              type="text"
              value={f.kundennummer}
              onChange={(e) => set('kundennummer', e.target.value)}
              placeholder="Optional"
              className={`${fieldBase} border-black/[0.08]`}
            />
          </div>
        </div>

        <div>
          <Label required>Nachricht</Label>
          <textarea
            value={f.nachricht}
            onChange={(e) => set('nachricht', e.target.value)}
            rows={4}
            placeholder="Deine Nachricht an uns …"
            className={`${fieldBase} resize-none ${errors.nachricht ? 'border-brand-orange/60' : 'border-black/[0.08]'}`}
          />
        </div>

        {/* consent checkboxes */}
        <div className="space-y-2.5 pt-1">
          <Checkbox
            checked={f.agbDatenschutz}
            onChange={(v) => set('agbDatenschutz', v)}
            error={!!errors.agbDatenschutz}
          >
            Durch das Absenden stimme ich der{' '}
            <a href={policyUrl} target="_blank" rel="noreferrer" className="font-medium text-ink underline">
              Datenschutzerklärung
            </a>{' '}
            zu.
          </Checkbox>
          <Checkbox checked={f.widerruf} onChange={(v) => set('widerruf', v)} error={!!errors.widerruf}>
            Ich habe die{' '}
            <a href={widerrufUrl} target="_blank" rel="noreferrer" className="font-medium text-ink underline">
              Widerrufsbelehrung
            </a>{' '}
            gelesen.
          </Checkbox>
        </div>

        {submitError && (
          <p className="rounded-xl border border-brand-orange/30 bg-brand-orange/5 px-3.5 py-2.5 text-xs text-brand-orange">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          disabled={sending}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-green px-4 py-3 text-sm font-medium text-white transition-transform hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? (
            'Wird gesendet …'
          ) : (
            <>
              Jetzt absenden <Send className="h-4 w-4" />
            </>
          )}
        </button>
      </form>
    </div>
  )
}

/* ── small field helpers ──────────────────────────────────────────────── */
function Select({
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  options: SalesforceOption[]
  placeholder: string
  error?: boolean
  disabled?: boolean
}) {
  return (
    <div className="relative">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={`${fieldBase} appearance-none pr-9 disabled:cursor-not-allowed disabled:opacity-60 ${
          value ? 'text-ink' : 'text-zinc-400'
        } ${error ? 'border-brand-orange/60' : 'border-black/[0.08]'}`}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="text-ink">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
    </div>
  )
}

function Checkbox({
  checked,
  onChange,
  error,
  children,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  error?: boolean
  children: ReactNode
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 text-xs leading-relaxed text-zinc-600">
      <button
        type="button"
        role="checkbox"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors ${
          checked
            ? 'border-brand-green bg-brand-green text-white'
            : error
              ? 'border-brand-orange/70 bg-white'
              : 'border-black/20 bg-white'
        }`}
      >
        {checked && <Check className="h-3.5 w-3.5" />}
      </button>
      <span>{children}</span>
    </label>
  )
}
