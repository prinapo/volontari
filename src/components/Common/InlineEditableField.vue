<template>
  <q-field
    v-if="!editing"
    :label="label"
    stack-label
    dense
    borderless
  >
    <template #control>
      <div class="self-center full-width no-outline text-body1">
        {{ displayValue || '—' }}
      </div>
    </template>
    <template #append>
      <q-btn
        v-if="!readonly"
        flat
        round
        dense
        icon="edit"
        size="sm"
        color="grey-6"
        aria-label="Modifica"
        @click.stop="startEdit()"
      >
        <q-tooltip>Modifica</q-tooltip>
      </q-btn>
      <FieldHistoryButton
        v-if="historyCollection && historyItemId && revisions != null"
        :collection="historyCollection"
        :item-id="historyItemId"
        :field="historyField"
        :label="historyLabel || label"
        :revisions="revisions"
        @ripristina="onRipristina"
      />
    </template>
  </q-field>

  <div v-else>
    <div v-if="type === 'date'" class="row items-center q-gutter-xs">
      <q-input
        ref="inputRef"
        v-model="editValue"
        outlined
        dense
        readonly
        class="col"
        @click="dateProxy?.show()"
      >
        <template #prepend>
          <q-icon name="event" class="cursor-pointer">
            <q-popup-proxy ref="dateProxy" cover>
              <q-date v-model="editValue" mask="YYYY-MM-DD" today-btn @update:model-value="dateProxy.hide()" />
            </q-popup-proxy>
          </q-icon>
        </template>
        <template #after>
          <q-btn
            data-testid="inline-save"
            icon="check_circle"
            color="positive"
            round
            flat
            dense
            size="sm"
            :loading="saving"
            aria-label="Salva"
            @click.stop="save"
          >
            <q-tooltip>Salva</q-tooltip>
          </q-btn>
          <q-btn
            data-testid="inline-cancel"
            icon="close"
            color="negative"
            round
            flat
            dense
            size="sm"
            aria-label="Annulla"
            @click.stop="cancel"
          >
            <q-tooltip>Annulla</q-tooltip>
          </q-btn>
        </template>
      </q-input>
    </div>
    <div v-else class="row items-center q-gutter-xs">
      <q-input
        ref="inputRef"
        v-model="editValue"
        :type="type"
        outlined
        dense
        :rules="rules"
        lazy-rules
        class="col"
        @keyup.enter="save"
        @keyup.esc="cancel"
      >
        <template #after>
          <q-btn
            data-testid="inline-save"
            icon="check_circle"
            color="positive"
            round
            flat
            dense
            size="sm"
            :loading="saving"
            aria-label="Salva"
            @click.stop="save"
          >
            <q-tooltip>Salva</q-tooltip>
          </q-btn>
          <q-btn
            data-testid="inline-cancel"
            icon="close"
            color="negative"
            round
            flat
            dense
            size="sm"
            aria-label="Annulla"
            @click.stop="cancel"
          >
            <q-tooltip>Annulla</q-tooltip>
          </q-btn>
        </template>
      </q-input>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import FieldHistoryButton from 'components/Common/FieldHistoryButton.vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
  type: { type: String, default: 'text' },
  rules: { type: Array, default: () => [] },
  formatDisplay: { type: Function, default: null },
  saving: { type: Boolean, default: false },
  // Cronologia revisioni
  historyCollection: { type: String, default: '' },
  historyItemId: { type: [String, Number], default: '' },
  historyField: { type: String, default: '' },
  historyLabel: { type: String, default: '' },
  revisions: { type: Array, default: null }
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

const editing = ref(false)
const editValue = ref(props.modelValue)
const inputRef = ref(null)
const dateProxy = ref(null)

const displayValue = computed(() => (props.formatDisplay ? props.formatDisplay(props.modelValue) : props.modelValue))

function startEdit() {
  editing.value = true
  editValue.value = props.type === 'date' ? (props.modelValue?.slice(0, 10) ?? '') : props.modelValue
}

function save() {
  const raw = editValue.value
  const current = props.type === 'date' ? (props.modelValue?.slice(0, 10) ?? '') : props.modelValue
  if (raw === current) {
    cancel()
    return
  }
  emit('save', raw)
  editing.value = false
}

function cancel() {
  editing.value = false
  editValue.value = props.modelValue
  emit('cancel')
}

function onRipristina({ field: _field, value }) {
  emit('save', value)
}
</script>
