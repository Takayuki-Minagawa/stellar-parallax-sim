/** @type {import('tailwindcss').Config} */
const token = name => `rgb(var(--c-${name}) / <alpha-value>)`

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // テーマ (ライト/ダーク) で切り替わる意味ベースの色 — src/index.css で定義
        app: token('app'),
        panel: token('panel'),
        card: token('card'),
        hover: token('hover'),
        line: token('line'),
        fg: token('fg'),
        muted: token('muted'),
        subtle: token('subtle'),
        accent: token('accent'),
        'accent-strong': token('accent-strong'),
      },
      fontFamily: {
        sans: ['"Noto Sans JP"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'Menlo', 'monospace'],
      },
      keyframes: {
        'fade-in': { from: { opacity: '0', transform: 'translateY(4px)' }, to: { opacity: '1', transform: 'none' } },
        pop: { '0%': { transform: 'scale(0.9)' }, '60%': { transform: 'scale(1.05)' }, '100%': { transform: 'scale(1)' } },
      },
      animation: {
        'fade-in': 'fade-in 0.25s ease-out',
        pop: 'pop 0.3s ease-out',
      },
    },
  },
  plugins: [],
}
