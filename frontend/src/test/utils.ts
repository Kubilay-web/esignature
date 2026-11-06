import { render } from '@testing-library/vue'
import MockAdapter from 'axios-mock-adapter'
import { createPinia, setActivePinia } from 'pinia'
import { vi } from 'vitest'
import type { Component } from 'vue'
import { createMemoryHistory, createRouter } from 'vue-router'
import { http } from '@/lib/api'

/** Fake backend: every request made through the axios instance is answered here. */
export const mockApi = () => new MockAdapter(http)

/** Renders a component with a fresh Pinia store and a router whose push() is spied on. */
export function renderWithPlugins(component: Component, props: Record<string, unknown> = {}) {
  const pinia = createPinia()
  setActivePinia(pinia)
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/:path(.*)*', component: { render: () => null } }],
  })
  const push = vi.spyOn(router, 'push')
  const result = render(component, { props, global: { plugins: [pinia, router] } })
  return { ...result, router, push }
}
