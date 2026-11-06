import { describe, expect, it } from 'vitest'
import { dictionaries, translate } from './i18n'

describe('i18n', () => {
  it('translates into Turkish and English', () => {
    expect(translate('tr', 'nav.documents')).toBe('Belgeler')
    expect(translate('en', 'nav.documents')).toBe('Documents')
  })

  it('fills in parameters', () => {
    expect(translate('en', 'sign.codeSent', { phone: '0555 *** ** 67' })).toBe(
      'A 6-digit code was sent to 0555 *** ** 67.',
    )
  })

  it('has every key in both languages, none empty', () => {
    const trKeys = Object.keys(dictionaries.tr).sort()
    expect(Object.keys(dictionaries.en).sort()).toEqual(trKeys)
    for (const lang of ['tr', 'en'] as const) {
      for (const [key, value] of Object.entries(dictionaries[lang])) {
        expect(value.trim(), `${lang}:${key}`).not.toBe('')
      }
    }
  })
})
