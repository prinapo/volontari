<template>
  <q-page class="q-pa-md admin-page">
    <div v-if="!store.loading && store.roles.length === 0" class="text-center text-grey-5 q-py-xl">
      <q-icon name="admin_panel_settings" size="64px" />
      <div class="text-h6 q-mt-md">Nessun ruolo trovato</div>
      <div class="text-body2">Verifica i permessi API di Directus.</div>
    </div>

    <div class="row items-center q-gutter-sm q-mb-md">
      <div>
        <div class="text-h5 text-weight-medium">Amministrazione</div>
        <div class="text-body2 text-grey-7">
          Gestisci l'assegnazione delle policy ai ruoli Directus.
        </div>
      </div>
      <q-space />
      <q-btn flat round icon="refresh" :loading="store.loading" @click="store.fetchAll">
        <q-tooltip>Aggiorna</q-tooltip>
      </q-btn>
    </div>

    <q-banner v-if="store.error" class="bg-red-1 text-negative q-mb-md" rounded>
      {{ store.error }}
    </q-banner>

    <q-table
      :rows="store.rolesWithPolicyNames"
      :columns="columns"
      row-key="id"
      flat
      bordered
      :loading="store.loading"
      :pagination="{ rowsPerPage: 0 }"
      hide-pagination
    >
      <template #body-cell-name="props">
        <q-td :props="props">
          <div class="text-weight-medium">{{ props.row.name }}</div>
          <div v-if="props.row.description" class="text-caption text-grey-7">{{ props.row.description }}</div>
        </q-td>
      </template>

      <template #body-cell-policies="props">
        <q-td :props="props">
          <div class="row q-gutter-xs">
            <q-badge
              v-for="p in (props.row.policies || [])"
              :key="p.policy_id?.id"
              outline
              color="primary"
              class="q-px-sm q-py-xs"
            >
              {{ p.policy_id?.name }}
            </q-badge>
            <span v-if="!props.row.policies?.length" class="text-grey-5 text-caption">Nessuna policy</span>
          </div>
        </q-td>
      </template>

      <template #body-cell-users="props">
        <q-td :props="props">
          {{ props.row.userCount }}
        </q-td>
      </template>

      <template #body-cell-actions="props">
        <q-td :props="props">
          <q-btn flat dense icon="policy" color="primary" @click="openPolicyDialog(props.row)">
            <q-tooltip>Gestisci policy</q-tooltip>
          </q-btn>
        </q-td>
      </template>
    </q-table>

    <PolicyAssegnaDialog
      v-model="showDialog"
      :role="selectedRole"
      :policies="store.policies"
      :saving="store.saving"
      @save="handleSave"
    />
  </q-page>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAdminStore } from 'stores/admin.store'
import PolicyAssegnaDialog from 'components/Admin/PolicyAssegnaDialog.vue'

const store = useAdminStore()

const columns = [
  { name: 'name', label: 'Ruolo', align: 'left', style: 'width: 200px' },
  { name: 'policies', label: 'Policy assegnate', align: 'left' },
  { name: 'users', label: 'Utenti', align: 'center', style: 'width: 80px' },
  { name: 'actions', label: '', align: 'center', style: 'width: 60px' }
]

const showDialog = ref(false)
const selectedRole = ref(null)

function openPolicyDialog(role) {
  selectedRole.value = role
  showDialog.value = true
}

async function handleSave(policyIds) {
  if (!selectedRole.value) return
  const ok = await store.setRolePolicies(selectedRole.value.id, policyIds)
  if (ok) {
    showDialog.value = false
    selectedRole.value = null
  }
}

onMounted(() => {
  store.fetchAll()
})
</script>
