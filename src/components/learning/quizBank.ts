import type { QuizQuestion } from '../../types'

type Tr = (key: string, params?: Record<string, string | number>) => string
type TrArr = (key: string) => string[]

/** 言語に依存しない問題の種 (ランダムなパラメータと選択肢の並び順を保持) */
export interface QuizSeed {
  id: string
  /** 表示位置 → 元の選択肢番号 (0 が正解) */
  order: number[]
  render: (tr: Tr, trArr: TrArr) => { question: string; choices: string[]; explanation: string }
}

const pick = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]
const fmt = (v: number) => String(+v.toPrecision(3))
const big = (v: number) => v.toLocaleString('en-US')

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function seed(id: string, n: number, render: QuizSeed['render']): QuizSeed {
  return { id, order: shuffle(Array.from({ length: n }, (_, i) => i)), render }
}

/** ロケール配列 (先頭が正解) の概念問題 */
const concept = (id: string) => () =>
  seed(id, 4, (tr, trArr) => ({
    question: tr(`quiz.q.${id}.question`),
    choices: trArr(`quiz.q.${id}.choices`),
    explanation: tr(`quiz.q.${id}.explanation`),
  }))

const GENERATORS: (() => QuizSeed)[] = [
  // 視差角 → 距離
  () => {
    const p = pick([0.5, 0.25, 0.1, 0.2, 0.4, 0.05, 0.125])
    const d = 1 / p
    return seed('distFromParallax', 4, tr => ({
      question: tr('quiz.q.distFromParallax.question', { p }),
      choices: [`${fmt(d)} pc`, `${fmt(p)} pc`, `${fmt(d * 2)} pc`, `${fmt(d * 3.26)} pc`],
      explanation: tr('quiz.q.distFromParallax.explanation', { p, d: fmt(d) }),
    }))
  },
  // 距離 → 視差角
  () => {
    const d = pick([2, 4, 5, 8, 10, 20, 50])
    const p = 1 / d
    return seed('parallaxFromDist', 4, tr => ({
      question: tr('quiz.q.parallaxFromDist.question', { d }),
      choices: [`${fmt(p)}″`, `${fmt(d)}″`, `${fmt(p / 2)}″`, `${fmt(p * 3.26)}″`],
      explanation: tr('quiz.q.parallaxFromDist.explanation', { d, p: fmt(p) }),
    }))
  },
  // どちらが近いか
  () => {
    const [pa, pb] = shuffle([0.5, 0.2, 0.08, 0.3, 0.12]).slice(0, 2)
    const closer = pa > pb ? 'A' : 'B'
    const other = closer === 'A' ? 'B' : 'A'
    return seed('whichCloser', 3, tr => ({
      question: tr('quiz.q.whichCloser.question', { pa, pb }),
      choices: [
        tr(`quiz.q.whichCloser.star${closer}`, { pa, pb }),
        tr(`quiz.q.whichCloser.star${other}`, { pa, pb }),
        tr('quiz.q.whichCloser.same'),
      ],
      explanation: tr('quiz.q.whichCloser.explanation', { star: tr(`quiz.q.whichCloser.name${closer}`), d: fmt(1 / Math.max(pa, pb)) }),
    }))
  },
  // 半年間のずれ = 2p (よくある誤解)
  () => {
    const sep = pick([0.4, 0.2, 1.0, 0.5, 0.1])
    const p = sep / 2
    return seed('halfYearShift', 4, tr => ({
      question: tr('quiz.q.halfYearShift.question', { sep }),
      // 正解 2/sep、誤答: 2p と取り違え (1/sep)・p と d の取り違え (p)・半分にし忘れの逆 (4/sep)
      choices: [`${fmt(1 / p)} pc`, `${fmt(1 / sep)} pc`, `${fmt(p)} pc`, `${fmt(2 / p)} pc`],
      explanation: tr('quiz.q.halfYearShift.explanation', { sep, p: fmt(p), d: fmt(1 / p) }),
    }))
  },
  // 観測精度 → 測れる距離
  () => {
    const lim = pick([0.01, 0.001, 0.0001])
    const d = 1 / lim
    return seed('precisionLimit', 4, tr => ({
      question: tr('quiz.q.precisionLimit.question', { lim }),
      choices: [`${big(d)} pc`, `${big(d / 10)} pc`, `${big(d * 10)} pc`, `${lim} pc`],
      explanation: tr('quiz.q.precisionLimit.explanation', { lim, d: big(d) }),
    }))
  },
  concept('parsecDef'),
  concept('doubleDistance'),
  concept('lightYear'),
  concept('poleShape'),
  concept('eclipticShape'),
  concept('background'),
  concept('aberration'),
  concept('evidence'),
  concept('naked'),
]

export const QUIZ_ROUND_SIZE = 6

/** 1 ラウンド分の問題の種をランダムに選ぶ */
export function generateQuizRound(): QuizSeed[] {
  return shuffle(GENERATORS).slice(0, QUIZ_ROUND_SIZE).map(g => g())
}

/** 現在の言語で問題文を組み立てる */
export function renderQuestion(s: QuizSeed, tr: Tr, trArr: TrArr): QuizQuestion {
  const { question, choices, explanation } = s.render(tr, trArr)
  return {
    id: s.id,
    question,
    choices: s.order.map(i => choices[i] ?? ''),
    correctIndex: s.order.indexOf(0),
    explanation,
  }
}
