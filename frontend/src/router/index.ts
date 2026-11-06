import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

declare module 'vue-router' {
  interface RouteMeta {
    /** only for logged-in users (others go to /login) */
    auth?: boolean
    /** only for guests: login/register (logged-in users go to /documents) */
    guest?: boolean
  }
}

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/documents' },
    { path: '/login', component: () => import('@/views/LoginView.vue'), meta: { guest: true } },
    { path: '/register', component: () => import('@/views/RegisterView.vue'), meta: { guest: true } },
    { path: '/documents', component: () => import('@/views/DocumentsView.vue'), meta: { auth: true } },
    { path: '/documents/new', component: () => import('@/views/NewDocumentView.vue'), meta: { auth: true } },
    { path: '/documents/:id', component: () => import('@/views/DocumentDetailView.vue'), meta: { auth: true } },
    { path: '/documents/:id/edit', component: () => import('@/views/EditDocumentView.vue'), meta: { auth: true } },
    { path: '/audit', component: () => import('@/views/AuditView.vue'), meta: { auth: true } },
    { path: '/profile', component: () => import('@/views/ProfileView.vue'), meta: { auth: true } },
    { path: '/:pathMatch(.*)*', redirect: '/documents' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})

router.beforeEach(async (to) => {
  const auth = useAuthStore()
  await auth.init()

  if (to.meta.auth && !auth.user) return '/login'
  if (to.meta.guest && auth.user) return '/documents'
})

export default router
