import { useEffect } from 'react'
import { useSimStore } from '../store/simulationStore'
import { stepMonth } from '../utils/astronomy'

/** Space / Enter で自分自身を操作する要素 (ショートカットで横取りしない) */
const INTERACTIVE_ROLES = new Set(['button', 'tab', 'checkbox', 'switch', 'link', 'option', 'menuitem', 'radio'])

/**
 * キーボードショートカット
 *  Space: 再生/一時停止   ← →: 1か月移動   1/2/3: 視点切替
 *  C: 半年比較   A: 光行差   T: 軌跡   ?: ヘルプ
 */
export function useKeyboardShortcuts() {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return
      const target = e.target as HTMLElement | null
      const tag = target?.tagName
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA' || target?.isContentEditable) return
      const interactive =
        tag === 'BUTTON' || tag === 'SUMMARY' || tag === 'A' ||
        INTERACTIVE_ROLES.has(target?.getAttribute('role') ?? '')

      const s = useSimStore.getState()
      if (s.helpOpen && e.key !== 'Escape' && e.key !== '?') return

      switch (e.key) {
        case ' ':
          // ボタン・折りたたみ見出しなどにフォーカスがあるときは標準動作に任せる
          if (interactive) return
          e.preventDefault()
          s.setPlaying(!s.playing)
          break
        case 'ArrowRight':
          e.preventDefault()
          s.setPlaying(false)
          s.setEarthAngle(stepMonth(s.earthAngleDeg, 1))
          break
        case 'ArrowLeft':
          e.preventDefault()
          s.setPlaying(false)
          s.setEarthAngle(stepMonth(s.earthAngleDeg, -1))
          break
        case '1': s.setViewMode('overhead'); break
        case '2': s.setViewMode('observer'); break
        case '3': s.setViewMode('stellar'); break
        case 'c': case 'C': s.setCompareMode(!s.compareMode); break
        case 'a': case 'A': s.setShowAberration(!s.showAberration); break
        case 't': case 'T': s.setShowTrail(!s.showTrail); break
        case '?': s.setHelpOpen(!s.helpOpen); break
        case 'Escape': if (s.helpOpen) s.setHelpOpen(false); break
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])
}
