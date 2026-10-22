import { useCallback, useEffect, useRef } from 'react'

export type DrawFn = (ctx: CanvasRenderingContext2D, w: number, h: number, time: number) => void

/**
 * Canvas 2D 用の共通フック
 * - 親要素のサイズに追従し、devicePixelRatio を考慮して解像度を設定
 * - deps が変わったときに 1 回だけ再描画 (animate = true なら毎フレーム描画)
 */
export function useCanvas(draw: DrawFn, deps: unknown[], animate = false) {
  const ref = useRef<HTMLCanvasElement>(null)
  const drawRef = useRef(draw)
  drawRef.current = draw
  const sizeRef = useRef({ w: 0, h: 0 })
  const frameRef = useRef(0)

  const render = useCallback((time: number) => {
    const canvas = ref.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx || sizeRef.current.w === 0) return
    const dpr = window.devicePixelRatio || 1
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, sizeRef.current.w, sizeRef.current.h)
    drawRef.current(ctx, sizeRef.current.w, sizeRef.current.h, time)
  }, [])

  const schedule = useCallback(() => {
    cancelAnimationFrame(frameRef.current)
    frameRef.current = requestAnimationFrame(render)
  }, [render])

  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ro = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      const dpr = window.devicePixelRatio || 1
      canvas.width = Math.max(1, Math.round(width * dpr))
      canvas.height = Math.max(1, Math.round(height * dpr))
      sizeRef.current = { w: width, h: height }
      schedule()
    })
    ro.observe(canvas)
    return () => ro.disconnect()
  }, [schedule])

  useEffect(() => {
    if (!animate) schedule()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    if (!animate) return
    let id = 0
    const loop = (t: number) => {
      render(t)
      id = requestAnimationFrame(loop)
    }
    id = requestAnimationFrame(loop)
    return () => cancelAnimationFrame(id)
  }, [animate, render])

  useEffect(() => () => cancelAnimationFrame(frameRef.current), [])

  return ref
}
