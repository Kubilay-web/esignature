import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { ApiError, apiUploadPdf, http } from './api'
import { usePreferencesStore } from '@/stores/preferences'
import { mockApi } from '@/test/utils'

describe('http (axios instance)', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('sends the auth cookie, JSON body and UI language', async () => {
    const api = mockApi()
    api.onPost('/users/login').reply(200, { ok: true })
    usePreferencesStore().setLang('en')

    const res = await http.post('/users/login', { email: 'a@b.com' })

    expect(res.data).toEqual({ ok: true })
    const request = api.history.post[0]!
    expect(request.baseURL).toBe('http://localhost:3001/api')
    expect(request.withCredentials).toBe(true)
    expect(JSON.parse(request.data)).toEqual({ email: 'a@b.com' })
    expect(request.headers?.['Accept-Language']).toBe('en')
  })

  it('throws ApiError with the backend message and status', async () => {
    mockApi().onPost('/users/login').reply(401, { message: 'E-posta veya şifre hatalı.' })

    const error = await http.post('/users/login').catch((e) => e)
    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({ status: 401, message: 'E-posta veya şifre hatalı.' })
  })

  it('turns a network failure into a readable message', async () => {
    mockApi().onGet('/documents').networkError()

    await expect(http.get('/documents')).rejects.toMatchObject({
      status: 0,
      message: 'Sunucuya ulaşılamadı. Bağlantınızı kontrol edin.',
    })
  })
})

describe('apiUploadPdf()', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('sends the file as the raw body with an encoded file name', async () => {
    const api = mockApi()
    api.onPut('/documents/1/file').reply(200, { id: '1' })
    const file = new File(['%PDF-1.7'], 'Sözleşme.pdf', { type: 'application/pdf' })

    await apiUploadPdf('/documents/1/file', file)

    const request = api.history.put[0]!
    expect(request.data).toBe(file)
    expect(request.headers?.['Content-Type']).toBe('application/pdf')
    expect(request.headers?.['X-File-Name']).toBe(encodeURIComponent('Sözleşme.pdf'))
  })
})
