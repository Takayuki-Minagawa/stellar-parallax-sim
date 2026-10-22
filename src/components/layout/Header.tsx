import { useEffect, useState } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { useSimStore } from '../../store/simulationStore'
import { useI18n } from '../../hooks/useI18n'
import { currentShareUrl } from '../../hooks/useUrlSync'
import type { Language } from '../../types'

const iconBtn =
  'w-8 h-8 flex items-center justify-center rounded-md bg-card hover:bg-hover border border-line text-muted hover:text-fg transition-colors'

export default function Header() {
  const { theme, toggle } = useTheme()
  const { tr } = useI18n()
  const language = useSimStore(s => s.language)
  const setLanguage = useSimStore(s => s.setLanguage)
  const setHelpOpen = useSimStore(s => s.setHelpOpen)
  const progress = useSimStore(s => s.progress)
  const [copied, setCopied] = useState(false)

  // タイトル・lang 属性を言語に追従させる
  useEffect(() => {
    document.title = tr('app.title')
    document.documentElement.lang = language
  }, [tr, language])

  const doneCount = Object.values(progress).filter(Boolean).length

  const handleShare = async () => {
    const url = currentShareUrl()
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      try {
        await navigator.share?.({ title: document.title, url })
      } catch {
        // share cancelled or unavailable
      }
    }
  }

  return (
    <header className="flex items-center justify-between gap-2 px-3 sm:px-4 py-2 bg-panel border-b border-line shrink-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <Logo />
        <div className="min-w-0">
          <h1 className="text-sm font-bold text-fg leading-tight truncate">{tr('app.title')}</h1>
          <p className="text-[11px] text-subtle leading-tight hidden sm:block truncate">{tr('app.subtitle')}</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {doneCount > 0 && (
          <span
            className="hidden md:inline-flex items-center gap-1 px-2 h-8 rounded-md bg-amber-400/10 border border-amber-400/30 text-amber-600 dark:text-amber-300 text-xs font-medium"
            title={tr('missions.title')}
          >
            ★ {doneCount}
          </span>
        )}

        <button onClick={() => setHelpOpen(true)} title={tr('header.help')} aria-label={tr('header.help')} className={iconBtn}>
          <span className="text-sm font-bold">?</span>
        </button>

        <div className="flex rounded-md overflow-hidden border border-line" role="group" aria-label={tr('header.language')}>
          {(['ja', 'en'] as Language[]).map(l => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              aria-pressed={language === l}
              className={`px-2.5 h-8 text-xs transition-colors ${
                language === l ? 'bg-accent-strong text-white' : 'bg-card text-muted hover:bg-hover'
              }`}
            >
              {l === 'ja' ? '日本語' : 'EN'}
            </button>
          ))}
        </div>

        <button onClick={handleShare} title={tr('header.share')} aria-label={tr('header.share')} className={`${iconBtn} relative`}>
          {copied ? <span className="text-green-500">✓</span> : <LinkIcon />}
          {copied && (
            <span className="absolute top-full right-0 mt-1 px-2 py-1 rounded bg-fg text-panel text-[11px] whitespace-nowrap animate-fade-in z-50">
              {tr('header.copied')}
            </span>
          )}
        </button>

        <button onClick={toggle} title={tr('header.theme')} aria-label={tr('header.theme')} className={iconBtn}>
          {theme === 'dark' ? <SunIcon /> : <MoonIcon />}
        </button>
      </div>
    </header>
  )
}

function Logo() {
  return (
    <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <defs>
        <radialGradient id="lg-sun" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fff6c0" />
          <stop offset="100%" stopColor="#ffb300" />
        </radialGradient>
      </defs>
      <rect width="32" height="32" rx="8" fill="#0b1630" />
      <ellipse cx="13" cy="18" rx="9" ry="4" fill="none" stroke="#5b7bb5" strokeWidth="1" />
      <circle cx="13" cy="18" r="2.6" fill="url(#lg-sun)" />
      <circle cx="21.5" cy="17" r="1.6" fill="#4f9bff" />
      <path d="M21.5 17 L26 6.5 M4.5 19 L26 6.5" stroke="#fde68a" strokeWidth="0.8" strokeDasharray="1.5 1.2" />
      <circle cx="26" cy="6.5" r="2" fill="#fff" />
    </svg>
  )
}

const LinkIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
  </svg>
)
const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
  </svg>
)
const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
)
