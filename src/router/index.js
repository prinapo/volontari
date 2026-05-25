import { createRouter, createWebHistory } from 'vue-router'
import { STORAGE_KEYS } from 'src/utils/constants'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('pages/LoginPage.vue'),
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
        path: 'migrazione',
        name: 'Migrazione',
        component: () => import('pages/MigrazionePage.vue')
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
    return next('/famiglie')
  }

  if (!isAuthenticated && to.meta.requiresAuth) {
    return next('/login')
  }

  next()
})

export default router
