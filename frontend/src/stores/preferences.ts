import { defineStore } from 'pinia'
import { ref } from 'vue'

export type Lang = 'tr' | 'en'
export type Theme = 'light' | 'dark'

// localStorage can throw (private mode / blocked storage): the preference just isn't remembered
const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

const initialTheme = (): Theme => {
  const saved = read('theme')
  if (saved === 'dark' || saved === 'light') return saved
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Language and theme, saved in localStorage and applied to <html>. */
export const usePreferencesStore = defineStore('preferences', () => {
  const lang = ref<Lang>(read('lang') === 'en' ? 'en' : 'tr')
  const theme = ref<Theme>(initialTheme())

  function setLang(value: Lang) {
    lang.value = value
    write('lang', value)
    document.documentElement.lang = value
  }

  function setTheme(value: Theme) {
    theme.value = value
    write('theme', value)
    document.documentElement.classList.toggle('dark', value === 'dark')
  }

  return { lang, theme, setLang, setTheme }
})
