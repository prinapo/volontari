import { createRouter, createWebHistory } from 'vue-router'
import { STORAGE_KEYS } from 'src/utils/constants'
import { useAuthStore } from 'stores/auth.store'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('pages/LoginPage.vue'),
    meta: { public: true }
  },
  {
    path: '/reset-password',
    name: 'ResetPassword',
    component: () => import('pages/ResetPasswordPage.vue'),
    meta: { public: true }
  },
  {
    path: '/',
    component: () => import('components/Layout/AppLayout.vue'),
    meta: { requiresAuth: true },
    children: [
      {
        path: '',
        redirect: { name: 'Famiglie' }
      },
      {
        path: 'famiglie',
        name: 'Famiglie',
        component: () => import('pages/FamigliePage.vue')
      },
      {
        path: 'verifica',
        name: 'Verifica',
        component: () => import('pages/VerificaPage.vue'),
        meta: { requiredRole: 'Verifica' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/famiglie'
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

router.beforeEach((to, from, next) => {
  const token = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN)
  const isAuthenticated = !!token

  if (isAuthenticated && to.meta.public) {
    const authStore = useAuthStore()
    return next(authStore.canVerifica ? '/verifica' : '/famiglie')
  }

  if (!isAuthenticated && to.meta.requiresAuth) {
    return next('/login')
  }

  if (to.meta.requiredRole) {
    const authStore = useAuthStore()
    if (authStore.initialized && !authStore.canVerifica) {
      return next('/famiglie')
    }
  }
  next()
})

export default router
