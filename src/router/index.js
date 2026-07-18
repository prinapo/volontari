import { createRouter, createWebHistory } from 'vue-router'
import { ROUTE_ROLES } from 'src/utils/permissions'
import { useAuthStore } from 'stores/auth.store'

const AUTH_MODE = 'cookie'

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
        meta: { requiredRole: ROUTE_ROLES.MANAGER }
      },
      {
        path: 'pagamenti',
        name: 'Pagamenti',
        component: () => import('pages/PagamentiPage.vue'),
        meta: { requiredRole: ROUTE_ROLES.MANAGER }
      },
      {
        path: 'riconciliazione',
        name: 'Riconciliazione',
        component: () => import('pages/RiconciliazionePage.vue'),
        meta: { requiredRole: ROUTE_ROLES.MANAGER }
      },
      {
        path: 'gestione',
        name: 'Gestione',
        component: () => import('pages/GestionePage.vue'),
        meta: { requiredRole: ROUTE_ROLES.MANAGER }
      },
      {
        path: 'admin',
        name: 'Admin',
        component: () => import('pages/AdminPage.vue'),
        meta: { requiredRole: ROUTE_ROLES.ADMIN }
      },
      {
        path: 'progetti/crea',
        name: 'CreaProgetto',
        component: () => import('pages/CreaProgettoPage.vue'),
        meta: { requiredRole: ROUTE_ROLES.ADMIN }
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
  const authStore = useAuthStore()

  // Attendi l'inizializzazione dell'auth store (cookie mode)
  if (!authStore.initialized && to.meta.requiresAuth && AUTH_MODE === 'cookie') {
    // L'inizializzazione è async, riprova al prossimo tick
    setTimeout(() => next(), 0)
    return
  }

  if (authStore.isAuthenticated && to.meta.public) {
    if (authStore.canManager) return next('/gestione')
    return next('/famiglie')
  }

  if (authStore.isAuthenticated && to.path === '/' && authStore.canManager) {
    return next('/gestione')
  }

  if (!authStore.isAuthenticated && to.meta.requiresAuth) {
    return next('/login')
  }

  if (to.meta.requiredRole) {
    if (to.meta.requiredRole === ROUTE_ROLES.MANAGER && !authStore.canManager) return next('/famiglie')
    if (to.meta.requiredRole === ROUTE_ROLES.ADMIN && !authStore.canAdmin) return next('/famiglie')
  }
  next()
})

export default router
