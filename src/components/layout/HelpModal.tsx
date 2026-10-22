import { useEffect, useState } from 'react'
import { useSimStore } from '../../store/simulationStore'
import { useI18n } from '../../hooks/useI18n'

const WELCOME_KEY = 'sps-welcome-seen'

interface Step { icon: string; title: string; body: string }

/** 初回訪問時のチュートリアル兼ヘルプ */
export default function HelpModal() {
  const { tr, trArr } = useI18n()
  const open = useSimStore(s => s.helpOpen)
  const setOpen = useSimStore(s => s.setHelpOpen)
  const [step, setStep] = useState(0)

  // 初回のみ自動表示
  useEffect(() => {
    try {
      if (!localStorage.getItem(WELCOME_KEY)) setOpen(true)
    } catch {
      // storage unavailable
    }
  }, [setOpen])

  useEffect(() => { if (open) setStep(0) }, [open])

  if (!open) return null

  const titles = trArr('help.stepTitles')
  const bodies = trArr('help.stepBodies')
  const icons = ['🌍', '🔭', '📈', '🎯']
  const steps: Step[] = titles.map((title, i) => ({ icon: icons[i] ?? '⭐', title, body: bodies[i] ?? '' }))
  const shortcuts = trArr('help.shortcuts')
  const isLast = step >= steps.length - 1

  const close = () => {
    try { localStorage.setItem(WELCOME_KEY, '1') } catch { /* ignore */ }
    setOpen(false)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in"
      onClick={close}
      role="dialog"
      aria-modal="true"
      aria-labelledby="help-title"
    >
      <div
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-panel border border-line shadow-2xl"
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-3 border-b border-line">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h2 id="help-title" className="text-base font-bold text-fg">{tr('help.title')}</h2>
              <p className="text-xs text-muted mt-1 leading-relaxed">{tr('help.intro')}</p>
            </div>
            <button onClick={close} className="text-subtle hover:text-fg text-lg leading-none" aria-label={tr('help.close')}>✕</button>
          </div>
        </div>

        {/* ステップ */}
        <div className="px-5 py-4">
          <div className="flex gap-1.5 mb-4" role="tablist">
            {steps.map((s, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                role="tab"
                aria-selected={i === step}
                aria-label={s.title}
                className={`h-1.5 flex-1 rounded-full transition-colors ${i <= step ? 'bg-accent' : 'bg-hover'}`}
              />
            ))}
          </div>
          {steps[step] && (
            <div key={step} className="flex gap-4 animate-fade-in min-h-[110px]">
              <div className="text-4xl leading-none">{steps[step].icon}</div>
              <div>
                <div className="text-sm font-semibold text-fg mb-1.5">
                  {step + 1}. {steps[step].title}
                </div>
                <p className="text-sm text-muted leading-relaxed">{steps[step].body}</p>
              </div>
            </div>
          )}
          <div className="flex justify-between mt-4">
            <button className="btn-ghost px-3 py-1.5" onClick={() => setStep(s => s - 1)} disabled={step === 0}>
              ← {tr('help.prev')}
            </button>
            {isLast ? (
              <button className="btn-primary px-4 py-1.5" onClick={close}>{tr('help.start')}</button>
            ) : (
              <button className="btn-primary px-4 py-1.5" onClick={() => setStep(s => s + 1)}>
                {tr('help.next')} →
              </button>
            )}
          </div>
        </div>

        {/* ショートカット */}
        <div className="px-5 py-4 border-t border-line bg-card/50">
          <div className="section-title mb-2">{tr('help.shortcutsTitle')}</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5">
            {shortcuts.map((s, i) => {
              const [keys, desc] = s.split('|')
              return (
                <div key={i} className="flex items-center gap-2 text-xs text-muted">
                  <span className="flex gap-1 shrink-0">
                    {keys.split(' ').map(k => <span key={k} className="kbd">{k}</span>)}
                  </span>
                  <span>{desc}</span>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
