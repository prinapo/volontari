<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-page class="flex flex-center bg-grey-2">
        <q-card class="login-card full-width" flat bordered>
          <template v-if="!token">
            <q-card-section class="text-center q-pt-xl q-px-xl">
              <div class="text-h6 text-negative">Link non valido</div>
              <div class="text-body2 text-grey q-mt-sm">
                Il link per il reset della password non è valido o è scaduto.
              </div>
            </q-card-section>
            <q-card-section class="text-center q-pb-xl">
              <q-btn flat color="primary" label="Torna al login" to="/login" />
            </q-card-section>
          </template>

          <template v-else-if="success">
            <q-card-section class="text-center q-pt-xl q-px-xl">
              <div class="text-h6 text-positive">Password aggiornata</div>
              <div class="text-body2 text-grey q-mt-sm">Reindirizzamento al login...</div>
            </q-card-section>
          </template>

          <template v-else>
            <q-card-section class="text-center q-pt-xl">
              <div class="text-h6 text-primary">Reimposta password</div>
              <div class="text-caption text-grey q-mt-sm">Scegli una nuova password per il tuo account</div>
            </q-card-section>

            <q-card-section class="q-px-xl q-pb-xl">
              <q-form class="q-gutter-y-md" @submit.prevent="handleReset">
                <q-input
                  v-model="newPassword"
                  label="Nuova password"
                  :type="showPwd1 ? 'text' : 'password'"
                  outlined
                  dense
                  data-testid="reset-password"
                  :rules="[val => !!val || 'Inserisci la nuova password']"
                  lazy-rules
                >
                  <template #append>
                    <q-icon
                      :name="showPwd1 ? 'visibility_off' : 'visibility'"
                      class="cursor-pointer"
                      @click="showPwd1 = !showPwd1"
                    />
                  </template>
                </q-input>

                <q-input
                  v-model="confirmPassword"
                  label="Conferma password"
                  :type="showPwd2 ? 'text' : 'password'"
                  outlined
                  dense
                  data-testid="reset-confirm-password"
                  :rules="[
                    val => !!val || 'Conferma la password',
                    val => val === newPassword || 'Le password non coincidono'
                  ]"
                  lazy-rules
                >
                  <template #append>
                    <q-icon
                      :name="showPwd2 ? 'visibility_off' : 'visibility'"
                      class="cursor-pointer"
                      @click="showPwd2 = !showPwd2"
                    />
                  </template>
                </q-input>

                <q-btn
                  type="submit"
                  color="primary"
                  label="Reimposta password"
                  class="full-width"
                  data-testid="reset-submit"
                  :loading="loading"
                />
              </q-form>

              <div v-if="error" class="text-negative text-center q-mt-md">
                {{ error }}
              </div>
            </q-card-section>
          </template>
        </q-card>
      </q-page>
    </q-page-container>
  </q-layout>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, computed } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { authService } from 'src/services/auth.service'

const $q = useQuasar()
const route = useRoute()
const router = useRouter()

const token = computed(() => route.query.token || null)
const newPassword = ref('')
const confirmPassword = ref('')
const showPwd1 = ref(false)
const showPwd2 = ref(false)
const loading = ref(false)
const error = ref(null)
const success = ref(false)

async function handleReset() {
  if (newPassword.value !== confirmPassword.value) {
    error.value = 'Le password non coincidono'
    return
  }
  loading.value = true
  error.value = null
  try {
    await authService.resetPassword(token.value, newPassword.value)
    success.value = true
    $q.notify({
      type: 'positive',
      message: 'Password aggiornata con successo'
    })
    setTimeout(() => router.push('/login'), 2000)
  } catch (error_) {
    const msg = error_.response?.data?.errors?.[0]?.message || 'Errore durante il reset della password'
    error.value = msg
  } finally {
    loading.value = false
  }
}
</script>
