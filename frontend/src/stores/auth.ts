import { defineStore } from 'pinia'
import { ref } from 'vue'
import { http } from '@/lib/api'
import type { User } from '@/lib/types'

/** Logged-in user. The auth cookie is httpOnly, so we ask the backend who we are. */
export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null)
  let checked: Promise<void> | null = null

  /** Runs once (the router waits for it before the first page). */
  function init() {
    checked ??= http
      .get<{ user: User }>('/users/me')
      .then((res) => {
        user.value = res.data.user
      })
      .catch(() => {
        user.value = null
      })
    return checked
  }

  async function login(email: string, password: string) {
    const res = await http.post<{ user: User }>('/users/login', { email, password })
    user.value = res.data.user
  }

  async function logout() {
    await http.post('/users/logout').catch(() => {})
    user.value = null
  }

  function setUser(value: User | null) {
    user.value = value
  }

  return { user, init, login, logout, setUser }
})
