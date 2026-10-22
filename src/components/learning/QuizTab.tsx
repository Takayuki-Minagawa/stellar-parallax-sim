import { useMemo, useState } from 'react'
import { useSimStore } from '../../store/simulationStore'
import { useI18n } from '../../hooks/useI18n'
import { generateQuizRound, renderQuestion, QUIZ_ROUND_SIZE, type QuizSeed } from './quizBank'

const BEST_KEY = 'sps-quiz-best'
const LETTERS = ['A', 'B', 'C', 'D']

function loadBest(): number {
  try { return Number(localStorage.getItem(BEST_KEY)) || 0 } catch { return 0 }
}

export default function QuizTab() {
  const { tr, trArr } = useI18n()
  const markMission = useSimStore(s => s.markMission)
  const [round, setRound] = useState<QuizSeed[]>(generateQuizRound)
  const [index, setIndex] = useState(0)
  const [answered, setAnswered] = useState<number | null>(null)
  const [results, setResults] = useState<boolean[]>([])
  const [best, setBest] = useState(loadBest)

  const done = index >= round.length
  const q = useMemo(() => (done ? null : renderQuestion(round[index], tr, trArr)), [round, index, done, tr, trArr])
  const score = results.filter(Boolean).length

  const answer = (i: number) => {
    if (answered !== null || !q) return
    setAnswered(i)
    setResults(r => [...r, i === q.correctIndex])
  }

  const next = () => {
    const nextIndex = index + 1
    setIndex(nextIndex)
    setAnswered(null)
    if (nextIndex >= round.length) {
      if (score >= 4) markMission('quiz')
      if (score > best) {
        setBest(score)
        try { localStorage.setItem(BEST_KEY, String(score)) } catch { /* ignore */ }
      }
    }
  }

  const retry = () => {
    setRound(generateQuizRound())
    setIndex(0)
    setAnswered(null)
    setResults([])
  }

  if (done) {
    const msg =
      score === round.length ? tr('quiz.allCorrect')
      : score >= 4 ? tr('quiz.goodJob')
      : tr('quiz.tryAgain')
    return (
      <div className="px-4 py-6 text-center space-y-4 animate-fade-in">
        <div className="text-3xl tracking-widest" aria-hidden>
          {results.map((ok, i) => <span key={i} className={ok ? '' : 'opacity-25 grayscale'}>⭐</span>)}
        </div>
        <div className="text-lg font-bold text-fg">
          {tr('quiz.scoreResult', { score, total: round.length })}
        </div>
        <div className="text-sm text-muted">{msg}</div>
        <div className="text-xs text-subtle">{tr('quiz.best', { best: Math.max(best, score), total: QUIZ_ROUND_SIZE })}</div>
        <button onClick={retry} className="btn-primary px-6 py-2 text-sm">{tr('quiz.retry')}</button>
      </div>
    )
  }

  if (!q) return null

  return (
    <div className="px-3 py-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex gap-1" aria-label={tr('quiz.questionOf', { current: index + 1, total: round.length })}>
          {round.map((_, i) => (
            <span
              key={i}
              className={`w-5 h-1.5 rounded-full ${
                i < results.length ? (results[i] ? 'bg-green-500' : 'bg-red-500') : i === index ? 'bg-accent' : 'bg-hover'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-subtle">{tr('quiz.questionOf', { current: index + 1, total: round.length })}</span>
      </div>

      <div key={index} className="card p-3 text-sm text-fg leading-relaxed animate-fade-in">{q.question}</div>

      <div className="space-y-1.5">
        {q.choices.map((choice, i) => {
          let style = 'border-line bg-card hover:border-accent hover:bg-hover'
          if (answered !== null) {
            if (i === q.correctIndex) style = 'border-green-500 bg-green-500/15 text-green-700 dark:text-green-200'
            else if (i === answered) style = 'border-red-500 bg-red-500/15 text-red-700 dark:text-red-200'
            else style = 'border-line bg-card opacity-50'
          }
          return (
            <button
              key={i}
              onClick={() => answer(i)}
              disabled={answered !== null}
              className={`w-full text-left px-3 py-2 rounded-md border text-sm transition-colors flex gap-2 items-start ${style}`}
            >
              <span className="font-mono text-xs text-subtle mt-0.5">{LETTERS[i]}</span>
              <span>{choice}</span>
            </button>
          )
        })}
      </div>

      {answered !== null && (
        <div className={`rounded-md p-3 text-xs border-l-4 animate-fade-in ${
          answered === q.correctIndex ? 'bg-green-500/10 border-green-500' : 'bg-red-500/10 border-red-500'
        }`}>
          <div className={`font-semibold mb-1 ${answered === q.correctIndex ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
            {answered === q.correctIndex ? `🎉 ${tr('quiz.correct')}` : `🤔 ${tr('quiz.incorrect')}`}
          </div>
          <div className="text-muted leading-relaxed">{q.explanation}</div>
        </div>
      )}

      {answered !== null && (
        <button onClick={next} className="btn-primary w-full py-2 text-sm">
          {index + 1 >= round.length ? tr('quiz.seeResults') : tr('quiz.next')} →
        </button>
      )}
    </div>
  )
}
