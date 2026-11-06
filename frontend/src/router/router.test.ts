import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import router from './index'
import { mockApi } from '@/test/utils'

describe('router guards', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('sends guests to /login', async () => {
    mockApi().onGet('/users/me').reply(401, { message: 'Giriş yapmanız gerekiyor.' })

    await router.push('/documents')
    expect(router.currentRoute.value.path).toBe('/login')
  })

  it('sends logged-in users from login/register to their documents', async () => {
    mockApi()
      .onGet('/users/me')
      .reply(200, { user: { _id: 'u1', name: 'Ayşe', email: 'a@b.com', role: 'user' } })

    await router.push('/register')
    expect(router.currentRoute.value.path).toBe('/documents')
  })
})
