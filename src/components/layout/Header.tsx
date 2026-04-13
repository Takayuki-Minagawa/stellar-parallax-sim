import { useState } from 'react'
import { useTheme } from '../../hooks/useTheme'
import { useSimStore } from '../../store/simulationStore'
import { useI18n } from '../../hooks/useI18n'
import type { Language } from '../../types'

export default function Header() {
  const { theme, toggle } = useTheme()
  const { tr } = useI18n()
  const language = useSimStore(s => s.language)
  const setLanguage = useSimStore(s => s.setLanguage)
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    const url = window.location.href
    try {
      if (navigator.share) {
        await navigator.share({ title: document.title, url })
      } else {
        await navigator.clipboard.writeText(url)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      }
    } catch {
      // share cancelled or clipboard unavailable
    }
  }

  return (
    <header className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 shrink-0">
      <div className="flex items-center gap-3">
        <span className="text-xl">⭐</span>
        <div>
          <h1 className="text-sm font-bold text-white leading-tight">{tr('app.title')}</h1>
          <p className="text-xs text-gray-500 leading-tight hidden sm:block">{tr('app.subtitle')}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* 言語切替 */}
        <div className="flex rounded overflow-hidden border border-gray-700">
          {(['ja', 'en'] as Language[]).map(l => (
            <button
              key={l}
              onClick={() => setLanguage(l)}
              className={`px-2.5 py-1 text-xs transition-colors ${
                language === l
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              {l === 'ja' ? '日本語' : 'EN'}
            </button>
          ))}
        </div>

        {/* URL共有 */}
        <button
          onClick={handleShare}
          title={tr('header.share')}
          className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-base transition-colors"
        >
          {copied ? '✓' : '🔗'}
        </button>

        {/* テーマ切替 */}
        <button
          onClick={toggle}
          title={tr('header.theme')}
          className="w-8 h-8 flex items-center justify-center rounded bg-gray-800 hover:bg-gray-700 border border-gray-700 text-base transition-colors"
        >
          {theme === 'dark' ? '☀️' : '🌙'}
        </button>
      </div>
    </header>
  )
}
