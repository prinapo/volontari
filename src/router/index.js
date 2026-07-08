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
    path: '/submit',
    name: 'Submit',
    component: () => import('pages/SubmitPage.vue'),
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
      },
      {
        path: 'riconciliazione',
        name: 'Riconciliazione',
        component: () => import('pages/RiconciliazionePage.vue'),
        meta: { requiredRole: 'Verifica' }
      },
      {
        path: 'gestione',
        name: 'Gestione',
        component: () => import('pages/GestionePage.vue'),
        meta: { requiredRole: 'Gestione' }
      },
      {
        path: 'deduplica',
        name: 'Deduplica',
        component: () => import('pages/DeduplicaPage.vue'),
        meta: { requiredRole: 'Admin' }
      },
      {
        path: 'admin',
        name: 'Admin',
        component: () => import('pages/AdminPage.vue'),
        meta: { requiredRole: 'Admin' }
      },
      {
        path: 'progetti/crea',
        name: 'CreaProgetto',
        component: () => import('pages/CreaProgettoPage.vue'),
        meta: { requiredRole: 'Admin' }
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
    if (authStore.canGestione) return next('/gestione')
    if (authStore.canVerifica) return next('/verifica')
    return next('/famiglie')
  }

  if (isAuthenticated && to.path === '/') {
    const authStore = useAuthStore()
    if (authStore.canGestione) return next('/gestione')
    if (authStore.canVerifica) return next('/verifica')
  }

  if (!isAuthenticated && to.meta.requiresAuth) {
    return next('/login')
  }

  if (to.meta.requiredRole) {
    const authStore = useAuthStore()
    if (to.meta.requiredRole === 'Verifica' && !authStore.canVerifica) return next('/famiglie')
    if (to.meta.requiredRole === 'Gestione' && !authStore.canGestione) return next('/famiglie')
    if (to.meta.requiredRole === 'Admin' && !authStore.canAdmin) return next('/famiglie')
  }
  next()
})

export default router
