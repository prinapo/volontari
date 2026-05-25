import { boot } from 'quasar/wrappers'
import { useAuthStore } from 'stores/auth.store'

export default boot(async () => {
  const authStore = useAuthStore()
  await authStore.initFromStorage()
})
