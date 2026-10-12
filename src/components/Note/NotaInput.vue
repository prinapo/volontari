<template>
  <div class="row items-end q-gutter-sm">
    <q-input
      :model-value="modelValue"
      class="col"
      outlined
      dense
      autogrow
      type="textarea"
      :label="label || undefined"
      :placeholder="placeholder"
      :data-testid="testidInput"
      @update:model-value="v => emit('update:modelValue', v)"
      @keydown.enter.exact.prevent="doSubmit"
    />
    <q-btn
      v-if="showButton && buttonIcon"
      color="primary"
      :icon="buttonIcon"
      :loading="loading"
      :disable="!modelValue?.trim()"
      :aria-label="buttonLabel || 'Aggiungi nota'"
      :data-testid="testidButton"
      @click="doSubmit"
    >
      <q-tooltip>{{ buttonLabel || 'Aggiungi nota' }}</q-tooltip>
    </q-btn>
    <q-btn
      v-else-if="showButton"
      color="primary"
      :label="buttonLabel || 'Aggiungi nota'"
      :loading="loading"
      :disable="!modelValue?.trim()"
      :data-testid="testidButton"
      @click="doSubmit"
    />
  </div>
</template>

<script setup>
const props = defineProps({
  modelValue: { type: String, default: '' },
  placeholder: { type: String, default: '' },
  label: { type: String, default: '' },
  testidInput: { type: String, default: undefined },
  testidButton: { type: String, default: undefined },
  showButton: { type: Boolean, default: true },
  buttonIcon: { type: String, default: undefined },
  buttonLabel: { type: String, default: '' },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits(['update:modelValue', 'submit'])

function doSubmit() {
  if (props.modelValue?.trim()) emit('submit')
}
</script>