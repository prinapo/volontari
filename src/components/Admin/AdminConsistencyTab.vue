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

    <q-separator class="q-my-md" />

    <q-banner v-if="store.emailPrimarieCheck" class="bg-grey-2 text-dark rounded-borders" rounded>
      <template #avatar>
        <q-icon name="mark_email_read" color="primary" />
      </template>
      <div class="text-weight-medium q-mb-xs">Email primarie</div>
      <div class="text-body2 q-mb-sm text-grey-7">
        {{ store.emailPrimarieCheck.duplicati.length }} contatti con più primarie,
        {{ store.emailPrimarieCheck.senzaPrimaria.length }} senza primaria.
      </div>

      <template v-if="emailPrimarieAnomalie > 0">
        <q-list dense>
          <q-item v-for="v in store.emailPrimarieCheck.duplicati" :key="v.contattoId" dense class="q-px-none">
            <q-item-section>
              <q-item-label>{{ v.nome }} {{ v.cognome }}</q-item-label>
              <q-item-label caption>{{ v.extraIds.length + 1 }} email primarie</q-item-label>
            </q-item-section>
          </q-item>
          <q-item v-for="v in store.emailPrimarieCheck.senzaPrimaria" :key="'n-' + v.contattoId" dense class="q-px-none">
            <q-item-section>
              <q-item-label>{{ v.nome }} {{ v.cognome }}</q-item-label>
              <q-item-label caption>Nessuna email primaria</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <q-btn
          color="primary"
          icon="auto_fix_high"
          label="Correggi tutte"
          class="q-mt-sm"
          :loading="store.emailPrimarieCheckLoading"
          @click="correggiEmailPrimarie"
        />
      </template>

      <template v-else>
        <div class="text-center q-py-md">
          <q-icon name="check_circle" color="positive" size="48px" />
          <div class="text-h6 text-positive q-mt-sm">Nessuna anomalia trovata</div>
        </div>
      </template>

      <template #action>
        <q-btn
          flat
          round
          dense
          size="sm"
          icon="refresh"
          :loading="store.emailPrimarieCheckLoading"
          @click="runEmailPrimarieCheck"
        >
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
      icon="mark_email_read"
      color="primary"
      class="q-mt-sm"
      :loading="store.emailPrimarieCheckLoading"
      @click="runEmailPrimarieCheck"
    >
      Verifica email primarie
    </q-btn>

    <q-separator class="q-my-md" />

    <q-banner v-if="store.emailLoginCheck" class="bg-grey-2 text-dark rounded-borders" rounded>
      <template #avatar>
        <q-icon name="link" color="primary" />
      </template>
      <div class="text-weight-medium q-mb-xs">Email login vs primaria</div>
      <div class="text-body2 q-mb-sm text-grey-7">
        {{ store.emailLoginCheck.disallineati.length }} contatti con email di login diversa dalla primaria.
      </div>

      <template v-if="store.emailLoginCheck.disallineati.length > 0">
        <q-list dense>
          <q-item v-for="v in store.emailLoginCheck.disallineati" :key="v.contattoId" dense class="q-px-none">
            <q-item-section>
              <q-item-label>{{ v.nome }} {{ v.cognome }}</q-item-label>
              <q-item-label caption>login: {{ v.loginEmail }} · primaria: {{ v.primaryEmail }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
        <q-btn
          color="primary"
          icon="auto_fix_high"
          label="Allinea alla login"
          class="q-mt-sm"
          :loading="store.emailLoginCheckLoading"
          @click="correggiEmailLogin"
        />
      </template>

      <template v-else>
        <div class="text-center q-py-md">
          <q-icon name="check_circle" color="positive" size="48px" />
          <div class="text-h6 text-positive q-mt-sm">Nessuna anomalia trovata</div>
        </div>
      </template>

      <template #action>
        <q-btn
          flat
          round
          dense
          size="sm"
          icon="refresh"
          :loading="store.emailLoginCheckLoading"
          @click="runEmailLoginCheck"
        >
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
      icon="link"
      color="primary"
      class="q-mt-sm"
      :loading="store.emailLoginCheckLoading"
      @click="runEmailLoginCheck"
    >
      Verifica login vs primaria
    </q-btn>

    <q-separator class="q-my-md" />

    <q-banner v-if="store.listeCheck" class="bg-grey-2 text-dark rounded-borders" rounded>
      <template #avatar>
        <q-icon name="receipt_long" color="primary" />
      </template>
      <div class="text-weight-medium q-mb-xs">Liste pagamenti</div>
      <div class="text-body2 text-grey-7">
        {{ store.listeCheck.liste.length }} liste · {{ store.listeCheck.mancanti.length }} mancanti,
        {{ store.listeCheck.orfane.length }} orfane, {{ store.listeCheck.duplicati.length }} nomi duplicati.
      </div>

      <div class="text-caption text-grey-7 q-mt-sm">
        Seleziona le liste e rigenera i file Excel dai pagamenti correnti (idempotente). Le liste non selezionate non
        vengono toccate.
      </div>

      <q-table
        v-model:selected="selectedListe"
        :rows="store.listeCheck.liste"
        :columns="listeColumns"
        row-key="id"
        selection="multiple"
        flat
        bordered
        hide-pagination
        :pagination="{ rowsPerPage: 0 }"
        class="bg-white q-mt-sm"
        :grid="$q.screen.lt.sm"
        :dense="$q.screen.lt.md"
      >
        <template #body-cell-data="props">
          <q-td :props="props">{{ formatDate(props.row.DataCreazione) }}</q-td>
        </template>
        <template #body-cell-righe="props">
          <q-td :props="props">{{ props.row.ConteggioRighe || 0 }}</q-td>
        </template>
        <template #body-cell-totale="props">
          <q-td :props="props">€{{ formatNumber(props.row.Totale) }}</q-td>
        </template>
        <template #body-cell-file="props">
          <q-td :props="props">
            <q-badge v-if="props.row.fileOk === true" color="positive">OK</q-badge>
            <q-badge v-else-if="props.row.fileOk === false" color="negative">KO</q-badge>
            <span v-else class="text-grey-6">—</span>
          </q-td>
        </template>
        <template #item="props">
          <div class="q-pa-xs col-12">
            <q-card flat bordered>
              <q-card-section>
                <div class="row items-center q-gutter-x-sm">
                  <q-checkbox v-model="selectedListe" :val="props.row" dense />
                  <span class="text-weight-medium">{{ props.row.Nome }}</span>
                  <q-space />
                  <q-badge v-if="props.row.fileOk === true" color="positive">OK</q-badge>
                  <q-badge v-else-if="props.row.fileOk === false" color="negative">KO</q-badge>
                  <span v-else class="text-grey-6">—</span>
                </div>
                <div class="text-caption q-mt-xs">Data: {{ formatDate(props.row.DataCreazione) }}</div>
                <div class="text-caption">
                  Righe: {{ props.row.ConteggioRighe || 0 }} · Totale: €{{ formatNumber(props.row.Totale) }}
                </div>
              </q-card-section>
            </q-card>
          </div>
        </template>
      </q-table>

      <div class="row items-center q-gutter-sm q-mt-sm">
        <q-btn
          outline
          color="primary"
          icon="fact_check"
          label="Controlla stato file"
          :loading="store.listeFileCheckLoading"
          @click="controllaFileListe"
        />
        <q-btn
          color="primary"
          icon="refresh"
          label="Rigenera selezionate"
          :disable="selectedListe.length === 0"
          :loading="store.listeCheckLoading"
          @click="rigeneraSelezionate"
        />
        <span v-if="selectedListe.length > 0" class="text-caption text-grey-7">
          {{ selectedListe.length }} selezionate
        </span>
      </div>

      <q-list
        v-if="store.listeCheck.mancanti.length > 0 || store.listeCheck.orfane.length > 0"
        dense
        class="q-mt-sm"
      >
        <q-item v-for="m in store.listeCheck.mancanti" :key="'m-' + m.id" dense class="q-px-none">
          <q-item-section>
            <q-item-label caption>Batch senza lista: {{ m.Nome }} ({{ m.pagamenti }} pagamenti)</q-item-label>
          </q-item-section>
        </q-item>
        <q-item v-for="o in store.listeCheck.orfane" :key="'o-' + o.id" dense class="q-px-none">
          <q-item-section>
            <q-item-label caption>Lista orfana: {{ o.Nome }}</q-item-label>
          </q-item-section>
        </q-item>
      </q-list>

      <template #action>
        <q-btn
          flat
          round
          dense
          size="sm"
          icon="refresh"
          :loading="store.listeCheckLoading"
          @click="runListeCheck"
        >
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
      icon="receipt_long"
      color="primary"
      class="q-mt-sm"
      :loading="store.listeCheckLoading"
      @click="runListeCheck"
    >
      Verifica liste pagamenti
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
const selectedListe = ref([])

const listeColumns = [
  { name: 'nome', label: 'Nome', align: 'left', field: 'Nome' },
  { name: 'data', label: 'Data', align: 'left' },
  { name: 'righe', label: 'Righe', align: 'right' },
  { name: 'totale', label: 'Totale', align: 'right' },
  { name: 'file', label: 'File', align: 'center' }
]

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(value)
  return Number.isFinite(date.getTime()) ? date.toLocaleDateString('it-IT') : '—'
}

function formatNumber(value) {
  return (Number.parseFloat(value) || 0).toFixed(2)
}

const emailPrimarieAnomalie = computed(() => {
  if (!store.emailPrimarieCheck) return -1
  return store.emailPrimarieCheck.duplicati.length + store.emailPrimarieCheck.senzaPrimaria.length
})

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

async function runEmailPrimarieCheck() {
  await store.fetchEmailPrimarieConsistency()
  if (store.error) {
    notifyError($q, store.error, 'Errore verifica email primarie')
  } else {
    notifySuccess($q, 'Verifica email primarie completata')
  }
}

async function correggiEmailPrimarie() {
  try {
    const result = await store.correggiEmailPrimarie()
    notifySuccess($q, `Contatti corretti: ${result.contattiCorretti}`)
  } catch {
    notifyError($q, store.error || 'Errore nella correzione email primarie')
  }
}

async function runEmailLoginCheck() {
  await store.fetchEmailLoginConsistency()
  if (store.error) {
    notifyError($q, store.error, 'Errore verifica login vs primaria')
  } else {
    notifySuccess($q, 'Verifica login vs primaria completata')
  }
}

async function correggiEmailLogin() {
  try {
    const result = await store.correggiEmailLogin()
    notifySuccess($q, `Contatti allineati: ${result.contattiCorretti}`)
  } catch {
    notifyError($q, store.error || 'Errore nella correzione login vs primaria')
  }
}

async function runListeCheck() {
  await store.fetchListeConsistency()
  if (store.error) {
    notifyError($q, store.error, 'Errore verifica liste')
  } else {
    selectedListe.value = []
    notifySuccess($q, 'Verifica liste completata')
  }
}

async function controllaFileListe() {
  await store.controllaFileListe()
  if (store.error) notifyError($q, store.error, 'Errore controllo file liste')
  else notifySuccess($q, 'Controllo file completato')
}

function rigeneraSelezionate() {
  if (selectedListe.value.length === 0) return
  $q.dialog({
    title: 'Rigenera liste selezionate',
    message: `Verranno rigenerati i file Excel di ${selectedListe.value.length} liste dai pagamenti correnti. Confermare?`,
    cancel: { label: 'Annulla', flat: true },
    ok: { label: 'Rigenera', color: 'primary' },
    persistent: true
  }).onOk(async () => {
    const selezionate = [...selectedListe.value]
    try {
      const summary = await store.rigeneraListeSelezionate(selezionate)
      const nErrori = summary.errori?.length || 0
      const msg =
        `${summary.aggiornate} aggiornate, ${summary.create} create, ${summary.eliminate} eliminate` +
        (nErrori ? `, ${nErrori} errori` : '')
      if (nErrori) notifyError($q, null, msg)
      else notifySuccess($q, msg)
      selectedListe.value = []
    } catch {
      notifyError($q, store.error || 'Errore rigenerazione liste')
    }
  })
}

async function clearUserRef(c) {
  try {
    await store.clearUserReference(c.id_contatto, c.user_id)
    notifySuccess($q, `${c.Nome} ${c.Cognome}: user_id rimosso`)
    await runConsistencyCheck()
  } catch {
    notifyError($q, store.error || 'Errore nella rimozione user_id')
  }
}

async function clearIsVolontario(c) {
  try {
    await store.clearIsVolontarioFlag(c.id_contatto)
    notifySuccess($q, `${c.Nome} ${c.Cognome}: IsVolontario resettato`)
    await runConsistencyCheck()
  } catch {
    notifyError($q, store.error || 'Errore nel reset IsVolontario')
  }
}

async function setVolontarioFlag(c) {
  try {
    await store.setVolontarioFlag(c.id_contatto)
    notifySuccess($q, `${c.Nome} ${c.Cognome}: IsVolontario impostato`)
    await runConsistencyCheck()
  } catch {
    notifyError($q, store.error || "Errore nell'impostazione IsVolontario")
  }
}

async function assignVolontarioRole(c) {
  try {
    await store.assignVolontarioRole(c.user_id)
    notifySuccess($q, `${c.Nome} ${c.Cognome}: ruolo Volontario assegnato`)
    await runConsistencyCheck()
  } catch {
    notifyError($q, store.error || 'Errore assegnazione ruolo')
  }
}

onMounted(() => {
  runConsistencyCheck()
})
</script>
