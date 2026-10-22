import { describe, it, expect } from 'vitest'
import { generateQuizRound, renderQuestion, QUIZ_ROUND_SIZE } from './quizBank'
import ja from '../../locales/ja.json'
import { t, tArr } from '../../utils/i18n'

const tr = (key: string, params?: Record<string, string | number>) => t(ja, key, params)
const trArr = (key: string) => tArr(ja, key)

describe('quiz bank', () => {
  it('always produces distinct choices with exactly one correct answer', () => {
    for (let round = 0; round < 300; round++) {
      const seeds = generateQuizRound()
      expect(seeds).toHaveLength(QUIZ_ROUND_SIZE)
      for (const seed of seeds) {
        const q = renderQuestion(seed, tr, trArr)
        expect(new Set(q.choices).size, `${q.id}: ${q.choices.join(' / ')}`).toBe(q.choices.length)
        expect(q.correctIndex).toBeGreaterThanOrEqual(0)
        expect(q.choices.every(c => c && !c.startsWith('quiz.'))).toBe(true)
        expect(q.question).not.toMatch(/\{\{|quiz\.q/)
        expect(q.explanation).not.toMatch(/\{\{|quiz\.q/)
      }
    }
  })
})
