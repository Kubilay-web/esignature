import { render, screen } from '@testing-library/vue'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { nextTick } from 'vue'
import LanguageToggle from './LanguageToggle.vue'
import ThemeToggle from './ThemeToggle.vue'
import BaseButton from './ui/BaseButton.vue'
import StatusBadge from './ui/StatusBadge.vue'
import { usePreferencesStore } from '@/stores/preferences'
import { renderWithPlugins } from '@/test/utils'

describe('StatusBadge', () => {
  it('shows the status in the current language', async () => {
    renderWithPlugins(StatusBadge, { status: 'signed' })
    expect(screen.getByText('İmzalandı')).toBeInTheDocument()

    usePreferencesStore().setLang('en')
    await nextTick()
    expect(screen.getByText('Signed')).toBeInTheDocument()
  })
})

describe('BaseButton', () => {
  it('is disabled and shows a spinner while loading', () => {
    renderWithPlugins(BaseButton, { loading: true })
    expect(screen.getByRole('button')).toBeDisabled()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('renders its slot', () => {
    render(BaseButton, { slots: { default: 'Kaydet' } })
    expect(screen.getByRole('button', { name: 'Kaydet' })).toBeEnabled()
  })
})

describe('Toggles', () => {
  it('switches the language and remembers it', async () => {
    renderWithPlugins(LanguageToggle)
    await userEvent.click(screen.getByRole('button', { name: 'Switch to English' }))

    expect(localStorage.getItem('lang')).toBe('en')
    expect(document.documentElement.lang).toBe('en')
    expect(screen.getByRole('button', { name: "Türkçe'ye geç" })).toHaveTextContent('TR')
  })

  it('switches to dark mode by adding the dark class', async () => {
    renderWithPlugins(ThemeToggle)
    await userEvent.click(screen.getByRole('button', { name: 'Karanlık moda geç' }))

    expect(document.documentElement).toHaveClass('dark')
    expect(localStorage.getItem('theme')).toBe('dark')
    expect(screen.getByRole('button', { name: 'Aydınlık moda geç' })).toBeInTheDocument()
  })
})
