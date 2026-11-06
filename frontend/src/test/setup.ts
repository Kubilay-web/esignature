import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/vue'
import { afterEach, vi } from 'vitest'

// jsdom does not implement scrolling
window.scrollTo = vi.fn() as unknown as typeof window.scrollTo

// jsdom has no canvas; the signature pad handles a missing 2D context
HTMLCanvasElement.prototype.getContext = vi.fn(() => null) as unknown as HTMLCanvasElement['getContext']

afterEach(() => {
  cleanup()
  localStorage.clear()
  document.documentElement.className = ''
  document.documentElement.lang = 'tr'
})
