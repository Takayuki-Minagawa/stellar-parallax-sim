import { Suspense } from 'react'
import Header from './components/layout/Header'
import ControlPanel from './components/controls/ControlPanel'
import OverheadView from './components/views/OverheadView'
import ObserverView from './components/views/ObserverView'
import StellarView from './components/views/StellarView'
import GraphPanel from './components/graphs/GraphPanel'
import LearningPanel from './components/learning/LearningPanel'
import { useSimStore } from './store/simulationStore'
import { useTheme } from './hooks/useTheme'

function ViewArea() {
  const viewMode = useSimStore(s => s.viewMode)
  return (
    <div className="w-full h-full">
      {viewMode === 'overhead' && (
        <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-gray-400">読み込み中...</div>}>
          <OverheadView />
        </Suspense>
      )}
      {viewMode === 'observer' && <ObserverView />}
      {viewMode === 'stellar' && <StellarView />}
    </div>
  )
}

export default function App() {
  useTheme()

  return (
    <div className="h-screen flex flex-col bg-gray-950 text-gray-100 overflow-hidden">
      <Header />

      {/* メインレイアウト */}
      <div className="flex-1 min-h-0 flex flex-col lg:flex-row">

        {/* 左: 操作パネル */}
        <aside className="lg:w-56 xl:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-gray-700 flex flex-col max-h-48 lg:max-h-none overflow-hidden">
          <ControlPanel />
        </aside>

        {/* 中央: ビュー */}
        <main className="flex-1 min-w-0 min-h-0 flex flex-col">
          {/* 可視化ビュー (上3分の2) */}
          <div className="flex-[3] min-h-0">
            <ViewArea />
          </div>

          {/* グラフパネル (下3分の1) */}
          <div className="flex-[2] min-h-0 border-t border-gray-700 max-h-56 lg:max-h-none">
            <GraphPanel />
          </div>
        </main>

        {/* 右: 学習パネル */}
        <aside className="lg:w-64 xl:w-72 shrink-0 border-t lg:border-t-0 lg:border-l border-gray-700 flex flex-col max-h-64 lg:max-h-none overflow-hidden">
          <LearningPanel />
        </aside>
      </div>
    </div>
  )
}
