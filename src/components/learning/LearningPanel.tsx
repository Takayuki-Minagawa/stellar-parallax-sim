import { useState, useMemo } from 'react'
import { useSimStore } from '../../store/simulationStore'
import { useI18n } from '../../hooks/useI18n'
import {
  distanceToParallax,
  formatParallax,
  formatDistance,
  getStarName,
  PRECISION_LEVELS,
  ABERRATION_KAPPA,
} from '../../utils/astronomy'
import type { QuizQuestion } from '../../types'

// ─── クイズ生成 ────────────────────────────────────────────────────────────────

function generateQuizzes(): QuizQuestion[] {
  const quizzes: QuizQuestion[] = []

  // 1. 視差角→距離 (選択肢は数値なので i18n 不要)
  const ps = [0.5, 0.25, 0.1, 0.2, 0.4]
  const p = ps[Math.floor(Math.random() * ps.length)]
  const d = Math.round(1 / p * 10) / 10
  quizzes.push({
    type: 'dist-from-parallax',
    questionKey: 'quiz.dist-from-parallax.question',
    choices: [
      `${d} pc`,
      `${(d * 2).toFixed(1)} pc`,
      `${(d * 0.5).toFixed(1)} pc`,
      `${(d * 3).toFixed(1)} pc`,
    ],
    correctIndex: 0,
    explanationKey: 'quiz.dist-from-parallax.explanation',
    params: { p, d },
  })

  // 2. どちらが近い (選択肢・説明ともにロケールキー参照)
  const p1 = 0.5, p2 = 0.2
  quizzes.push({
    type: 'which-is-closer',
    questionKey: 'quiz.which-is-closer.question',
    choices: ['quiz.which-is-closer.choiceA', 'quiz.which-is-closer.choiceB'],
    correctIndex: 0,
    explanationKey: 'quiz.which-is-closer.explanation',
    // closer は説明文中で置換するため、ロケールキー参照を格納する
    params: { p1, p2, closer: 'quiz.which-is-closer.closerA', d: 1 / p1 },
  })

  // 3. 1pc の定義 (choicesKey でロケール配列を使用)
  quizzes.push({
    type: 'parsec-def',
    questionKey: 'quiz.parsec-def.question',
    choices: [],
    choicesKey: 'quiz.parsec-def.choices',
    correctIndex: 0,
    explanationKey: 'quiz.parsec-def.explanation',
    params: {},
  })

  return quizzes
}

// ─── 学習パネル ────────────────────────────────────────────────────────────────

export default function LearningPanel() {
  const { tr } = useI18n()
  const [mode, setMode] = useState<'explain' | 'quiz'>('explain')

  return (
    <div className="h-full flex flex-col bg-gray-900 dark:bg-gray-950 text-gray-100 text-sm overflow-y-auto">
      {/* タブ */}
      <div className="flex border-b border-gray-700 shrink-0">
        {(['explain', 'quiz'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`flex-1 py-1.5 text-xs font-medium transition-colors ${
              mode === m ? 'text-blue-400 border-b-2 border-blue-400' : 'text-gray-500 hover:text-gray-300'
            }`}
          >
            {m === 'explain' ? tr('learning.title') : tr('learning.quizTitle')}
          </button>
        ))}
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {mode === 'explain' ? <ExplainView /> : <QuizView />}
      </div>
    </div>
  )
}

// ─── 解説ビュー ────────────────────────────────────────────────────────────────

function ExplainView() {
  const { tr } = useI18n()
  const stars = useSimStore(s => s.stars)
  const viewMode = useSimStore(s => s.viewMode)
  const selectedStarId = useSimStore(s => s.selectedStarId)
  const distanceUnit = useSimStore(s => s.distanceUnit)
  const language = useSimStore(s => s.language)

  const star = stars.find(s => s.id === selectedStarId) ?? stars[0]

  const hints: string[] = useMemo(() => {
    const h: string[] = []
    if (star) {
      if (star.distancePc < 5) h.push(tr('learning.stateNear'))
      else if (star.distancePc > 50) h.push(tr('learning.stateFar'))
    }
    if (viewMode === 'overhead') h.push(tr('learning.stateOverhead'))
    if (viewMode === 'observer') h.push(tr('learning.stateObserver'))
    h.push(tr('learning.hint1'))
    h.push(tr('learning.hint2'))
    h.push(tr('learning.hint3'))
    return h
  }, [star, viewMode, tr])

  return (
    <div className="px-3 py-3 space-y-3">
      {/* 選択中の恒星の情報カード */}
      {star && (
        <div className="rounded-lg bg-gray-800 border border-gray-700 p-3 space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full" style={{ background: star.color }} />
            <span className="font-semibold text-sm">{getStarName(star, language)}</span>
          </div>
          <div className="text-xs text-gray-400 space-y-0.5">
            <div>
              {tr('learning.distanceLabel')}:{' '}
              <span className="text-white font-mono">{formatDistance(star.distancePc, distanceUnit)}</span>
            </div>
            <div>
              {tr('learning.parallaxLabel')}:{' '}
              <span className="text-white font-mono">{formatParallax(distanceToParallax(star.distancePc))}</span>
            </div>
            <div className="text-blue-400 font-mono text-xs mt-1">d [pc] = 1 / p [″]</div>
          </div>
        </div>
      )}

      {/* ヒント・解説 */}
      <div className="space-y-2">
        {hints.map((h, i) => (
          <div
            key={i}
            className="flex gap-2 text-xs text-gray-300 bg-gray-800 rounded px-3 py-2 border-l-2 border-blue-600"
          >
            <span className="text-blue-400 mt-0.5 shrink-0">ℹ</span>
            <span>{h}</span>
          </div>
        ))}
      </div>

      {/* 定義 */}
      <div className="rounded-lg bg-indigo-950 border border-indigo-800 p-3 text-xs text-indigo-200 space-y-1">
        <div className="font-semibold text-indigo-300">{tr('learning.parsecTitle')}</div>
        <div>{tr('learning.parsecDef')}</div>
        <div className="font-mono text-blue-400 mt-1">{tr('learning.parallaxFormula')}</div>
      </div>

      {/* 年周光行差 */}
      <div className="rounded-lg bg-amber-950 border border-amber-800 p-3 text-xs text-amber-100 space-y-1.5">
        <div className="font-semibold text-amber-300">{tr('aberration.label')}</div>
        <div className="font-mono text-amber-400">{tr('aberration.kappa')}</div>
        <div>{tr('aberration.explain')}</div>
        <div className="text-amber-300/70 text-[10px]">{tr('aberration.phaseNote')}</div>
        <div className="font-mono text-[10px] text-amber-400">
          ΔRA = κ × cos(θ − φ) &nbsp; κ ≈ {ABERRATION_KAPPA.toFixed(2)}″
        </div>
      </div>

      {/* 観測精度 */}
      <div className="rounded-lg bg-gray-800 border border-gray-700 p-3 text-xs space-y-1.5">
        <div className="font-semibold text-gray-300">{tr('precision.label')}</div>
        {PRECISION_LEVELS.map(level => {
          const detectable = (star?.parallaxArcsec ?? 0) >= level.limitArcsec
          return (
            <div key={level.key} className="flex items-center justify-between">
              <span style={{ color: level.color }}>{tr(level.key)}</span>
              <span className={detectable ? 'text-green-400' : 'text-gray-600'}>
                {detectable ? tr('precision.detectable') : tr('precision.notDetectable')}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── クイズビュー ──────────────────────────────────────────────────────────────

function QuizView() {
  const { tr, trArr } = useI18n()
  const [quizzes] = useState<QuizQuestion[]>(generateQuizzes)
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState<number | null>(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)

  const q = quizzes[index]

  // params 内のロケールキー参照（'quiz.' で始まる文字列）を解決する
  const resolvedParams = useMemo((): Record<string, string> => {
    if (!q?.params) return {}
    return Object.fromEntries(
      Object.entries(q.params).map(([k, v]) => {
        const s = String(v)
        return [k, s.startsWith('quiz.') ? tr(s) : s]
      })
    )
  }, [q, tr])

  // 選択肢テキストを取得（ロケールキー参照・配列キー・リテラルに対応）
  const choices = useMemo((): string[] => {
    if (!q) return []
    if (q.choicesKey) return trArr(q.choicesKey)
    return q.choices.map(c =>
      c.startsWith('quiz.') ? tr(c, resolvedParams) : c
    )
  }, [q, tr, trArr, resolvedParams])

  const handleAnswer = (i: number) => {
    if (answered !== null) return
    setAnswered(i)
    if (i === q.correctIndex) setScore(s => s + 1)
  }

  const handleNext = () => {
    if (index + 1 >= quizzes.length) {
      setDone(true)
    } else {
      setIndex(i => i + 1)
      setAnswered(null)
    }
  }

  const handleRetry = () => {
    setIndex(0)
    setAnswered(null)
    setScore(0)
    setDone(false)
  }

  if (done) {
    const resultMsg =
      score === quizzes.length ? tr('quiz.allCorrect') :
      score >= quizzes.length * 0.7 ? tr('quiz.goodJob') :
      tr('quiz.tryAgain')

    return (
      <div className="px-4 py-6 text-center space-y-4">
        <div className="text-4xl">🌟</div>
        <div className="text-lg font-semibold">
          {tr('quiz.scoreResult', { score: String(score), total: String(quizzes.length) })}
        </div>
        <div className="text-sm text-gray-400">{resultMsg}</div>
        <button
          onClick={handleRetry}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors"
        >
          {tr('quiz.retry')}
        </button>
      </div>
    )
  }

  if (!q) return null

  return (
    <div className="px-3 py-3 space-y-3">
      {/* 問題番号 */}
      <div className="flex justify-between items-center text-xs text-gray-500">
        <span>{tr('quiz.questionOf', { current: String(index + 1), total: String(quizzes.length) })}</span>
        <span>{tr('quiz.scoreLabel')}: {score}</span>
      </div>

      {/* 問題文 */}
      <div className="bg-gray-800 rounded-lg p-3 text-sm text-gray-100">
        {tr(q.questionKey, resolvedParams)}
      </div>

      {/* 選択肢 */}
      <div className="space-y-2">
        {choices.map((choice, i) => {
          let style = 'bg-gray-800 hover:bg-gray-700 border-gray-600'
          if (answered !== null) {
            if (i === q.correctIndex) style = 'bg-green-900 border-green-600 text-green-200'
            else if (i === answered) style = 'bg-red-900 border-red-700 text-red-200'
            else style = 'bg-gray-800 border-gray-700 opacity-50'
          }
          return (
            <button
              key={i}
              onClick={() => handleAnswer(i)}
              disabled={answered !== null}
              className={`w-full text-left px-3 py-2.5 rounded border text-sm transition-colors ${style}`}
            >
              {choice}
            </button>
          )
        })}
      </div>

      {/* 解説 */}
      {answered !== null && (
        <div className={`rounded p-3 text-xs border-l-4 ${
          answered === q.correctIndex
            ? 'bg-green-950 border-green-500 text-green-200'
            : 'bg-red-950 border-red-500 text-red-200'
        }`}>
          <div className="font-semibold mb-1">
            {answered === q.correctIndex ? tr('quiz.correct') : tr('quiz.incorrect')}
          </div>
          <div className="text-gray-300">{tr(q.explanationKey, resolvedParams)}</div>
        </div>
      )}

      {/* 次へ */}
      {answered !== null && (
        <button
          onClick={handleNext}
          className="w-full py-2 bg-blue-600 hover:bg-blue-500 rounded text-sm transition-colors"
        >
          {index + 1 >= quizzes.length ? tr('quiz.seeResults') : tr('quiz.next')}
        </button>
      )}
    </div>
  )
}
