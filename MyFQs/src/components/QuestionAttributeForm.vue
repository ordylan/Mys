
<template>
  <div>
    <label>Subject:</label>
    <div class="subjects">
      <label v-for="s in subjects" :key="s.value">
        <input
          type="radio"
          name="subject"
          :value="s.value"
          v-model="subject"
        />
        {{ s.label }}
      </label>
    </div>
    <label>Knowledge Points:</label>
    <KpsInput v-model="kps" />
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import KpsInput from './KpsInput.vue';

const props = defineProps({
  modelValue: Object,
});
const emits = defineEmits(['update:modelValue']);

const subjects = [
  { value: 12, label: 'Mathematics' },
  { value: 14, label: 'Physics' },
  { value: 15, label: 'Chemistry' },
  { value: 18, label: 'Biology' },
  { value: 11, label: 'Chinese' },
  { value: 13, label: 'English' },
];

const subject = ref(props.modelValue?.subject_code ?? 12);
const kps = ref(props.modelValue?.kps ?? '');

watch([subject, kps], () => {
  emits('update:modelValue', { subject_code: subject.value, kps: kps.value });
});
watch(() => props.modelValue, (val) => {
  subject.value = val?.subject_code ?? 12;
  kps.value = val?.kps ?? '';
});
</script>

<style scoped>
.subjects {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}
</style>