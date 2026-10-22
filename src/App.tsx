import { useState } from 'react'
import Header from './components/layout/Header'
import HelpModal from './components/layout/HelpModal'
import ControlPanel from './components/controls/ControlPanel'
import TimelineBar from './components/controls/TimelineBar'
import ViewArea from './components/views/ViewArea'
import GraphPanel from './components/graphs/GraphPanel'
import LearningPanel from './components/learning/LearningPanel'
import { useTheme } from './hooks/useTheme'
import { useUrlSync } from './hooks/useUrlSync'
import { useAnimationLoop } from './hooks/useAnimationLoop'
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts'
import { useMissionTracker } from './hooks/useMissionTracker'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useI18n } from './hooks/useI18n'

export default function App() {
  useTheme()
  useUrlSync()
  useAnimationLoop()
  useKeyboardShortcuts()
  useMissionTracker()
  const isDesktop = useMediaQuery('(min-width: 1024px)')

  return (
    <div className="h-full flex flex-col bg-app text-fg overflow-hidden">
      <Header />
      {isDesktop ? <DesktopLayout /> : <MobileLayout />}
      <HelpModal />
    </div>
  )
}

function DesktopLayout() {
  return (
    <div className="flex-1 min-h-0 flex">
      <aside className="w-64 xl:w-72 shrink-0 border-r border-line flex flex-col overflow-hidden">
        <ControlPanel />
      </aside>

      <main className="flex-1 min-w-0 min-h-0 flex flex-col">
        <div className="flex-[3] min-h-0">
          <ViewArea />
        </div>
        <TimelineBar />
        <div className="flex-[2] min-h-0 border-t border-line">
          <GraphPanel />
        </div>
      </main>

      <aside className="w-80 xl:w-[22rem] shrink-0 border-l border-line flex flex-col overflow-hidden">
        <LearningPanel />
      </aside>
    </div>
  )
}

type MobileTab = 'controls' | 'graph' | 'learn'

/** スマホ・タブレット: ビュー + タイムライン + 切替式の下部パネル */
function MobileLayout() {
  const { tr } = useI18n()
  const [tab, setTab] = useState<MobileTab>('learn')

  return (
    <div className="flex-1 min-h-0 flex flex-col">
      <div className="h-[42vh] min-h-[220px] shrink-0">
        <ViewArea />
      </div>
      <TimelineBar />
      <div className="flex border-y border-line bg-panel shrink-0" role="tablist">
        {(['controls', 'graph', 'learn'] as const).map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={tab === t ? 'tab-on' : 'tab-off'}
          >
            {tr(`mobile.${t}`)}
          </button>
        ))}
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">
        {tab === 'controls' && <ControlPanel />}
        {tab === 'graph' && <GraphPanel />}
        {tab === 'learn' && <LearningPanel />}
      </div>
    </div>
  )
}
