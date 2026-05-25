<template>
  <q-page class="q-pa-md">
    <div class="text-h6 q-mb-md">Migrazione utenti</div>
    <div class="text-caption text-grey q-mb-md">
      Questa pagina è per uso amministrativo per creare account Directus per volontari esistenti.
    </div>

    <q-table
      :rows="rows"
      :columns="columns"
      row-key="id_contatto"
      :loading="loading"
      flat
      bordered
    >
      <template v-slot:body-cell-status="props">
        <q-td :props="props">
          <q-badge
            :color="props.row.user_id ? 'positive' : 'warning'"
          >
            {{ props.row.user_id ? 'Creato' : 'Da creare' }}
          </q-badge>
        </q-td>
      </template>

      <template v-slot:body-cell-actions="props">
        <q-td :props="props">
          <q-btn
            v-if="!props.row.user_id"
            color="primary"
            dense
            size="sm"
            label="Crea utente"
            :loading="creatingUserId === props.row.id_contatto"
            @click="createUser(props.row)"
          />
        </q-td>
      </template>
    </q-table>
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useQuasar } from 'quasar'
import api from 'src/services/api'

const $q = useQuasar()

const columns = [
  { name: 'nome', label: 'Nome', field: 'Nome', sortable: true },
  { name: 'cognome', label: 'Cognome', field: 'Cognome', sortable: true },
  { name: 'email', label: 'Email', field: 'Email' },
  { name: 'status', label: 'Stato', field: 'user_id' },
  { name: 'actions', label: 'Azioni' }
]

const rows = ref([])
const loading = ref(false)
const creatingUserId = ref(null)

onMounted(() => {
  loadData()
})

async function loadData() {
  loading.value = true
  try {
    const [volontariRes, emailRes, roleRes] = await Promise.all([
      api.get('/items/Famiglie_Contatti', {
        params: {
          'filter[Ruolo_nella_Famiglia][_eq]': 'Volontario',
          'fields[]': ['Contatto.id_contatto', 'Contatto.Nome', 'Contatto.Cognome', 'Contatto.user_id', 'Ruolo_nella_Famiglia']
        }
      }),
      api.get('/items/email', {
        params: {
          'fields[]': ['email_address', 'Primary', 'Contatto_Relation'],
          'limit': -1
        }
      }),
      api.get('/roles')
    ])

    const emails = emailRes.data.data || []
    const volontari = volontariRes.data.data || []

    rows.value = volontari.map(item => {
      const emailRecord = emails.find(
        e => e.Contatto_Relation === item.Contatto.id_contatto && e.Primary === true
      )
      return {
        id_contatto: item.Contatto.id_contatto,
        Nome: item.Contatto.Nome,
        Cognome: item.Contatto.Cognome,
        Email: emailRecord?.email_address || '',
        user_id: item.Contatto.user_id
      }
    })
  } catch (err) {
    $q.notify({ type: 'negative', message: 'Errore caricamento dati' })
  } finally {
    loading.value = false
  }
}

async function createUser(row) {
  creatingUserId.value = row.id_contatto
  try {
    const password = 'Mongolfiera' + row.Nome.charAt(0).toUpperCase() + row.Cognome.charAt(0).toUpperCase() + '!!'

    const roleRes = await api.get('/roles')
    const ruoloVolontario = (roleRes.data.data || []).find(r => r.name === 'Volontario')

    if (!ruoloVolontario) {
      $q.notify({ type: 'negative', message: 'Ruolo Volontario non trovato' })
      return
    }

    const userRes = await api.post('/users', {
      first_name: row.Nome,
      last_name: row.Cognome,
      email: row.Email,
      password: password,
      role: ruoloVolontario.id,
      status: 'active'
    })

    await api.patch(`/items/contatti/${row.id_contatto}`, {
      user_id: userRes.data.data.id
    })

    $q.notify({ type: 'positive', message: `Utente creato per ${row.Nome} ${row.Cognome}` })
    row.user_id = userRes.data.data.id
  } catch (err) {
    $q.notify({ type: 'negative', message: `Errore: ${err.response?.data?.errors?.[0]?.message || err.message}` })
  } finally {
    creatingUserId.value = null
  }
}
</script>
