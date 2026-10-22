export default function Toggle({ label, hint, value, onChange, shortcut }: {
  label: string
  hint?: string
  value: boolean
  onChange: (v: boolean) => void
  shortcut?: string
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <span className="relative inline-flex w-9 h-5 shrink-0 mt-0.5">
        <input
          type="checkbox"
          className="peer sr-only"
          checked={value}
          onChange={e => onChange(e.target.checked)}
        />
        <span className={`absolute inset-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent ${value ? 'bg-accent-strong' : 'bg-hover border border-line'}`} />
        <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-4' : ''}`} />
      </span>
      <span className="min-w-0">
        <span className="flex items-center gap-2 text-sm text-fg">
          {label}
          {shortcut && <span className="kbd">{shortcut}</span>}
        </span>
        {hint && <span className="block text-[11px] leading-snug text-subtle mt-0.5">{hint}</span>}
      </span>
    </label>
  )
}
