<template>
  <div
    class="inline-editable-field"
    :class="{ 'cursor-pointer': !readonly }"
    @click="!readonly && !editing && startEdit()"
  >
    <!-- Display mode -->
    <template v-if="!editing">
      <div class="row items-center">
        <div class="col">
          <div class="text-caption text-grey">
            {{ label }}
          </div>
          <div class="text-body1" style="word-break: break-word; overflow-wrap: break-word; white-space: pre-wrap;">
            {{ displayValue || '—' }}
            <q-icon
              v-if="!readonly"
              name="edit"
              size="xs"
              class="text-grey-4 q-ml-xs"
            />
          </div>
        </div>
      </div>
    </template>

    <!-- Edit mode -->
    <template v-else>
      <div class="text-caption text-grey">
        {{ label }}
      </div>
      <div class="row items-center q-gutter-xs">
        <q-input
          ref="inputRef"
          v-model="editValue"
          :type="type"
          dense
          autofocus
          :rules="rules"
          lazy-rules
          class="col"
          @keyup.enter="save"
          @keyup.esc="cancel"
        />
        <q-btn
          data-testid="inline-save"
          icon="check"
          color="positive"
          dense
          size="xs"
          flat
          :loading="saving"
          @click.stop="save"
        />
        <q-btn
          data-testid="inline-cancel"
          icon="close"
          color="negative"
          dense
          size="xs"
          flat
          @click.stop="cancel"
        />
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, nextTick } from 'vue'

const props = defineProps({
  modelValue: { type: [String, Number], default: '' },
  label: { type: String, default: '' },
  readonly: { type: Boolean, default: false },
  type: { type: String, default: 'text' },
  rules: { type: Array, default: () => [] },
  formatDisplay: { type: Function, default: null },
  saving: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

const editing = ref(false)
const editValue = ref(props.modelValue)
const inputRef = ref(null)

const displayValue = computed(() =>
  props.formatDisplay ? props.formatDisplay(props.modelValue) : props.modelValue
)

function startEdit() {
  editing.value = true
  editValue.value = props.type === 'date'
    ? (props.modelValue?.slice(0, 10) ?? '')
    : props.modelValue
  nextTick(() => {
    inputRef.value?.focus()
  })
}

function save() {
  const raw = editValue.value
  const current = props.type === 'date'
    ? (props.modelValue?.slice(0, 10) ?? '')
    : props.modelValue
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
</script>
