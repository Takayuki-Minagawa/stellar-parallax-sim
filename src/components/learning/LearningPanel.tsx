import { useState } from 'react'
import { useSimStore } from '../../store/simulationStore'
import { useI18n } from '../../hooks/useI18n'
import ExplainTab from './ExplainTab'
import MissionsTab, { MISSIONS } from './MissionsTab'
import ChallengeTab from './ChallengeTab'
import QuizTab from './QuizTab'

type LearnTab = 'explain' | 'missions' | 'challenge' | 'quiz'

const TAB_ICONS: Record<LearnTab, string> = { explain: '📘', missions: '🧭', challenge: '📏', quiz: '❓' }

export default function LearningPanel() {
  const { tr } = useI18n()
  const [tab, setTab] = useState<LearnTab>('explain')
  const progress = useSimStore(s => s.progress)
  const done = MISSIONS.filter(m => progress[m]).length

  return (
    <div className="h-full flex flex-col bg-panel text-fg text-sm">
      <div className="flex border-b border-line shrink-0 px-1 overflow-x-auto" role="tablist">
        {(['explain', 'missions', 'challenge', 'quiz'] as const).map(t => (
          <button
            key={t}
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`${tab === t ? 'tab-on' : 'tab-off'} px-1`}
          >
            <span aria-hidden className="mr-0.5">{TAB_ICONS[t]}</span>
            {tr(`learning.tabs.${t}`)}
            {t === 'missions' && (
              <span className="ml-1 text-[10px] text-subtle font-mono">{done}/{MISSIONS.length}</span>
            )}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {tab === 'explain' && <ExplainTab />}
        {tab === 'missions' && <MissionsTab />}
        {tab === 'challenge' && <ChallengeTab />}
        {tab === 'quiz' && <QuizTab />}
      </div>
    </div>
  )
}
