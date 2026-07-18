<template>
  <div>
    <q-banner v-if="store.volontariCheck" class="bg-grey-2 text-dark q-mb-md rounded-borders" rounded>
      <template #avatar>
        <q-icon name="fact_check" color="primary" />
      </template>
      <div class="text-weight-medium q-mb-xs">Verifica consistenza Volontari</div>
      <div class="text-body2 q-mb-sm text-grey-7">
        Risultati: {{ store.volontariCheck.senzaUtente.length }} senza utente,
        {{ store.volontariCheck.utenteCancellato.length }} con utente cancellato,
        {{ store.volontariCheck.flagOrfano.length }} flag orfani, {{ store.volontariCheck.linkSenzaFlag.length }} link
        senza flag, {{ store.volontariCheck.senzaRuolo.length }} senza ruolo.
      </div>

      <template v-if="store.volontariCheck.senzaUtente.length > 0">
        <q-separator class="q-mb-sm" />
        <div class="text-caption text-weight-medium q-mb-xs">Senza utente Directus</div>
        <q-list dense>
          <q-item v-for="c in store.volontariCheck.senzaUtente" :key="c.id_contatto" dense class="q-px-none">
            <q-item-section
              ><q-item-label>{{ c.Nome }} {{ c.Cognome }}</q-item-label></q-item-section
            >
            <q-item-section side>
              <q-btn
flat
round
dense
icon="person_add"
color="primary"
size="sm"
@click="creaUtenteVolontario(c)">
                <q-tooltip>Crea account Directus</q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </template>

      <template v-if="store.volontariCheck.utenteCancellato.length > 0">
        <q-separator class="q-mb-sm" />
        <div class="text-caption text-weight-medium q-mb-xs">Utente Directus cancellato</div>
        <q-list dense>
          <q-item v-for="c in store.volontariCheck.utenteCancellato" :key="c.id_contatto" dense class="q-px-none">
            <q-item-section
              ><q-item-label>{{ c.Nome }} {{ c.Cognome }}</q-item-label></q-item-section
            >
            <q-item-section side class="q-gutter-xs">
              <q-btn
flat
round
dense
icon="clear"
color="negative"
size="sm"
@click="clearUserRef(c)">
                <q-tooltip>Rimuovi user_id rotto</q-tooltip>
              </q-btn>
              <q-btn
flat
round
dense
icon="person_add"
color="primary"
size="sm"
@click="creaUtenteVolontario(c)">
                <q-tooltip>Crea nuovo account</q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </template>

      <template v-if="store.volontariCheck.flagOrfano.length > 0">
        <q-separator class="q-mb-sm" />
        <div class="text-caption text-weight-medium q-mb-xs">
          Flag IsVolontario orfano (nessun link famiglia attivo)
        </div>
        <q-list dense>
          <q-item v-for="c in store.volontariCheck.flagOrfano" :key="c.id_contatto" dense class="q-px-none">
            <q-item-section
              ><q-item-label>{{ c.Nome }} {{ c.Cognome }}</q-item-label></q-item-section
            >
            <q-item-section side>
              <q-btn
flat
round
dense
icon="flag_off"
color="warning"
size="sm"
@click="clearIsVolontario(c)">
                <q-tooltip>Resetta IsVolontario</q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </template>

      <template v-if="store.volontariCheck.linkSenzaFlag.length > 0">
        <q-separator class="q-mb-sm" />
        <div class="text-caption text-weight-medium q-mb-xs">Link Volontario attivo ma IsVolontario mancante</div>
        <q-list dense>
          <q-item v-for="c in store.volontariCheck.linkSenzaFlag" :key="c.id_contatto" dense class="q-px-none">
            <q-item-section
              ><q-item-label>{{ c.Nome }} {{ c.Cognome }}</q-item-label></q-item-section
            >
            <q-item-section side>
              <q-btn
flat
round
dense
icon="check_circle"
color="positive"
size="sm"
@click="setVolontarioFlag(c)">
                <q-tooltip>Imposta IsVolontario</q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </template>

      <template v-if="store.volontariCheck.senzaRuolo.length > 0">
        <q-separator class="q-mb-sm" />
        <div class="text-caption text-weight-medium q-mb-xs">Utente Directus senza ruolo</div>
        <q-list dense>
          <q-item v-for="c in store.volontariCheck.senzaRuolo" :key="c.id_contatto" dense class="q-px-none">
            <q-item-section>
              <q-item-label>{{ c.Nome }} {{ c.Cognome }}</q-item-label>
              <q-item-label caption>{{ c.email }}</q-item-label>
            </q-item-section>
            <q-item-section side>
              <q-btn
                flat
                round
                dense
                icon="badge"
                color="primary"
                size="sm"
                :loading="savingVolontario"
                @click="assignVolontarioRole(c)"
              >
                <q-tooltip>Assegna ruolo Volontario</q-tooltip>
              </q-btn>
            </q-item-section>
          </q-item>
        </q-list>
      </template>

      <template v-if="totalAnomalie === 0">
        <div class="text-center q-py-md">
          <q-icon name="check_circle" color="positive" size="48px" />
          <div class="text-h6 text-positive q-mt-sm">Nessuna anomalia trovata</div>
          <div class="text-body2 text-grey-7">Tutti i volontari sono configurati correttamente.</div>
        </div>
      </template>

      <template #action>
        <q-btn
flat
round
dense
size="sm"
icon="refresh"
:loading="store.volontariCheckLoading"
@click="runConsistencyCheck">
          <q-tooltip>Riesegui verifica</q-tooltip>
        </q-btn>
      </template>
    </q-banner>

      <q-btn
      v-else
      flat
      round
      dense
      size="sm"
      icon="fact_check"
      color="primary"
      class="q-mb-md"
      :loading="store.volontariCheckLoading"
      @click="runConsistencyCheck"
    >
      Verifica consistenza Volontari
    </q-btn>
  </div>
</template>

<script setup>
import { useQuasar } from 'quasar'
import { ref, computed, onMounted } from 'vue'
import { contattiService } from 'src/services/contatti.service'
import { usersService } from 'src/services/users.service'
import { notifyError, notifySuccess } from 'src/utils/notify'
import { useAdminStore } from 'stores/admin.store'

const $q = useQuasar()
const store = useAdminStore()

const savingVolontario = ref(false)

const totalAnomalie = computed(() => {
  if (!store.volontariCheck) return -1
  return (
    store.volontariCheck.senzaUtente.length +
    store.volontariCheck.utenteCancellato.length +
    store.volontariCheck.flagOrfano.length +
    store.volontariCheck.linkSenzaFlag.length +
    store.volontariCheck.senzaRuolo.length
  )
})

async function creaUtenteVolontario(v) {
  savingVolontario.value = true
  try {
    const rolesRes = await usersService.getRoleByName('Volontario')
    const ruoloId = rolesRes.data.data?.[0]?.id
    let email = Array.isArray(v.email)
      ? v.email.find(e => e.Primary)?.email_address || v.email[0]?.email_address || ''
      : v.email || ''
    if (!email) {
      notifyError($q, null, 'Email mancante')
      return
    }

    const userRes = await usersService.searchByEmail(email)
    const existing = (userRes.data.data || [])[0]
    if (existing) {
      await contattiService.update(v.id_contatto, { user_id: existing.id })
      if (!existing.role && ruoloId) {
        await usersService.update(existing.id, { role: ruoloId })
      }
    } else {
      const newUserRes = await usersService.create({
        email,
        password: 'Temp_' + Math.random().toString(36).slice(2, 10) + '_2026!',
        first_name: v.Nome || '',
        last_name: v.Cognome || '',
        role: ruoloId
      })
      if (newUserRes.data.data?.id) {
        await contattiService.update(v.id_contatto, { user_id: newUserRes.data.data.id })
      }
    }
    notifySuccess($q, 'Account creato per ' + (v.Nome || '') + ' ' + (v.Cognome || ''))
    await runConsistencyCheck()
  } catch (error) {
    notifyError($q, error, 'Errore creazione account')
  } finally {
    savingVolontario.value = false
  }
}

async function runConsistencyCheck() {
  await store.fetchVolontariConsistency()
  if (store.volontariCheck) {
    notifySuccess($q, 'Verifica completata')
  }
}

async function clearUserRef(c) {
  const ok = await store.clearUserReference(c.id_contatto, c.user_id)
  if (ok) {
    notifySuccess($q, `${c.Nome} ${c.Cognome}: user_id rimosso`)
    await runConsistencyCheck()
  } else {
    notifyError($q, store.error, 'Errore nella rimozione user_id')
  }
}

async function clearIsVolontario(c) {
  const ok = await store.clearIsVolontarioFlag(c.id_contatto)
  if (ok) {
    notifySuccess($q, `${c.Nome} ${c.Cognome}: IsVolontario resettato`)
    await runConsistencyCheck()
  } else {
    notifyError($q, store.error, 'Errore nel reset IsVolontario')
  }
}

async function setVolontarioFlag(c) {
  const ok = await store.setVolontarioFlag(c.id_contatto)
  if (ok) {
    notifySuccess($q, `${c.Nome} ${c.Cognome}: IsVolontario impostato`)
    await runConsistencyCheck()
  } else {
    notifyError($q, store.error, "Errore nell'impostazione IsVolontario")
  }
}

async function assignVolontarioRole(c) {
  const ok = await store.assignVolontarioRole(c.user_id)
  if (ok) {
    notifySuccess($q, `${c.Nome} ${c.Cognome}: ruolo Volontario assegnato`)
    await runConsistencyCheck()
  } else {
    notifyError($q, store.error, 'Errore assegnazione ruolo')
  }
}

onMounted(() => {
  runConsistencyCheck()
})
</script>
