import { useState } from 'react'
import { motion } from 'motion/react'
import { Check } from './icons'

type ConfigEditorProps = {
  title: string
  description: string
  value: string
  onChange: (v: string) => void
  onSave: (v: string) => Promise<void>
  loading?: boolean
  mono?: boolean
}

/** Full-page editor for a backend-persisted config value (system prompt / datenschutz). */
export default function ConfigEditor({
  title,
  description,
  value,
  onChange,
  onSave,
  loading = false,
  mono = false,
}: ConfigEditorProps) {
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const save = async () => {
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      await onSave(value)
      setSaved(true)
      window.setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-end justify-between gap-4">
        <div>
          <h2 className="font-display text-3xl font-semibold tracking-tight text-ink md:text-4xl">
            {title}
          </h2>
          <p className="mt-2 max-w-xl text-sm text-zinc-600">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-xs text-red-600">{error}</span>}
          {saved && (
            <motion.span
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="inline-flex items-center gap-1 text-xs lowercase text-ink"
            >
              <Check className="h-3.5 w-3.5" /> saved
            </motion.span>
          )}
          <button
            type="button"
            onClick={save}
            disabled={saving || loading || !value.trim()}
            className="rounded-full bg-brand-green px-5 py-2 text-sm font-medium text-white transition-opacity disabled:bg-zinc-200 disabled:text-zinc-400"
          >
            {saving ? 'saving…' : 'save'}
          </button>
        </div>
      </div>

      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={loading}
        spellCheck={false}
        placeholder={loading ? 'loading…' : ''}
        className={`mt-6 h-[55vh] w-full resize-none rounded-2xl border border-black/[0.08] bg-white p-4 text-sm leading-relaxed text-ink soft-shadow focus:outline-none focus:ring-2 focus:ring-brand-green/40 ${
          mono ? 'font-mono text-xs' : ''
        }`}
      />
    </div>
  )
}
