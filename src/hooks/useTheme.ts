import { useEffect } from 'react'
import { useSimStore } from '../store/simulationStore'

export function useTheme() {
  const theme = useSimStore(s => s.theme)
  const setTheme = useSimStore(s => s.setTheme)

  useEffect(() => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [theme])

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  return { theme, toggle }
}
