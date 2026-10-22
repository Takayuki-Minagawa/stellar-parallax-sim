import { useEffect } from 'react'
import { useSimStore } from '../store/simulationStore'

export function useTheme() {
  const theme = useSimStore(s => s.theme)
  const setTheme = useSimStore(s => s.setTheme)

  useEffect(() => {
    const root = document.documentElement
    root.classList.toggle('dark', theme === 'dark')
    root.style.colorScheme = theme
  }, [theme])

  const toggle = () => setTheme(theme === 'dark' ? 'light' : 'dark')
  return { theme, toggle }
}
