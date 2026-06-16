<template>
  <q-layout view="lHh Lpr lFf">
    <q-page-container>
      <q-banner v-if="isDev" class="bg-orange-9 text-white text-center q-py-xs">
        🔧 AMBIENTE DI TEST
      </q-banner>
      <q-page class="flex flex-center bg-grey-2 column">
        <q-card class="login-card" flat bordered>
          <q-card-section class="text-center q-pt-xl">
            <div class="text-h4 text-primary">
              Portale Volontario
            </div>
            <div class="text-caption text-grey q-mt-sm">
              Accedi per gestire i tuoi progetti
            </div>
          </q-card-section>

          <q-card-section class="q-px-xl q-pb-xl">
            <q-form class="q-gutter-y-md" @submit.prevent="handleLogin">
              <q-input
                v-model="email"
                label="Email"
                type="email"
                outlined
                dense
                data-testid="login-email"
                autocomplete="email"
                :rules="[val => !!val || 'Inserisci la tua email']"
                lazy-rules
              />
              <q-input
                v-model="password"
                label="Password"
                :type="showPassword ? 'text' : 'password'"
                outlined
                dense
                data-testid="login-password"
                autocomplete="current-password"
                :rules="[val => !!val || 'Inserisci la password']"
                lazy-rules
              >
                <template #append>
                  <q-icon
                    :name="showPassword ? 'visibility_off' : 'visibility'"
                    class="cursor-pointer"
                    @click="showPassword = !showPassword"
                  />
                </template>
              </q-input>

              <q-btn
                type="submit"
                color="primary"
                label="Accedi"
                class="full-width"
                :loading="authStore.loading"
                data-testid="login-submit"
              />

              <div class="text-center">
                <q-btn
                  flat
                  dense
                  label="Password dimenticata?"
                  color="grey"
                  size="sm"
                  @click="showForgotPassword = true"
                />
              </div>
            </q-form>

            <div v-if="authStore.error" class="text-negative text-center q-mt-md">
              {{ authStore.error }}
            </div>
          </q-card-section>
        </q-card>

        <q-card flat bordered class="q-mt-md" style="max-width: 420px; width: 100%;">
          <q-card-section class="text-center">
            <div class="text-body2 text-grey-8 q-mb-sm">
              Non hai un account?
            </div>
            <q-btn
              color="secondary"
              size="md"
              label="Invia un giustificativo senza account →"
              to="/submit"
              class="full-width"
            />
          </q-card-section>
        </q-card>

        <div class="text-caption text-grey-5 text-center q-mt-md">
          v{{ version }}
        </div>
      </q-page>
    </q-page-container>

    <!-- Forgot Password Dialog -->
    <q-dialog v-model="showForgotPassword" persistent>
      <q-card style="width: 100%; max-width: 400px; min-width: unset">
        <q-card-section class="row items-center">
          <div class="text-h6">
            Recupera password
          </div>
          <q-space />
          <q-btn v-close-popup icon="close" flat round dense>
            <q-tooltip>Chiudi</q-tooltip>
          </q-btn>
        </q-card-section>
        <q-card-section>
          <p class="text-body2 text-grey">
            Inserisci la tua email riceverai un link per reimpostare la password.
          </p>
          <q-input
            v-model="resetEmail"
            label="Email"
            type="email"
            outlined
            dense
          />
        </q-card-section>
        <q-card-actions align="right">
          <q-btn v-close-popup flat label="Annulla" />
          <q-btn
            color="primary"
            label="Invia link"
            :loading="sendingReset"
            @click="handleForgotPassword"
          />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </q-layout>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { version } from '../../package.json'
import { useQuasar } from 'quasar'
import { useAuthStore } from 'stores/auth.store'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { authService } from 'src/services/auth.service'

const isDev = import.meta.env.DEV || import.meta.env.VITE_APP_ENV === 'test'
const $q = useQuasar()
const router = useRouter()
const authStore = useAuthStore()

const email = ref('')
const password = ref('')
const showPassword = ref(false)
const showForgotPassword = ref(false)
const resetEmail = ref('')
const sendingReset = ref(false)

async function handleLogin() {
  const ok = await authStore.login(email.value, password.value)
  if (ok) {
    if (authStore.canGestione) return router.push('/gestione')
    if (authStore.canVerifica) return router.push('/verifica')
    router.push('/famiglie')
  }
}

async function handleForgotPassword() {
  if (!resetEmail.value) return
  sendingReset.value = true
  try {
    await authService.requestPasswordReset(
      resetEmail.value,
      'https://volontari.sostienilsostegno.com/reset-password?token='
    )
    notifySuccess($q, "Se l'email esiste, riceverai un link per il reset")
    showForgotPassword.value = false
  } catch (err) {
    notifyError($q, err, "Errore nell'invio della richiesta")
  } finally {
    sendingReset.value = false
  }
}
</script>

<style scoped>
.login-card {
  width: 100%;
  max-width: 420px;
}
</style>
