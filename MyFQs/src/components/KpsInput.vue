
<template>
  <div>
    <div class="tags">
      <span v-for="(kp, idx) in kps" :key="idx" class="tag">
        {{ kp }}
        <button @click="removeKp(idx)">×</button>
      </span>
    </div>
    <input
      v-model="input"
      @keyup.enter="addKp"
      placeholder="Enter knowledge point, press Enter"
    />
    <button @click="addKp" :disabled="!input">Add</button>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';

const props = defineProps({ modelValue: String });
const emits = defineEmits(['update:modelValue']);

const kps = ref(props.modelValue ? props.modelValue.split('||') : []);
const input = ref('');

watch(() => props.modelValue, (val) => {
  kps.value = val ? val.split('||') : [];
});

function addKp() {
  if (input.value.trim() && !kps.value.includes(input.value.trim())) {
    kps.value.push(input.value.trim());
    emits('update:modelValue', kps.value.join('||'));
    input.value = '';
  }
}
function removeKp(idx) {
  kps.value.splice(idx, 1);
  emits('update:modelValue', kps.value.join('||'));
}
</script>

<style scoped>
.tags {
  margin-bottom: 4px;
}
.tag {
  display: inline-block;
  background: #e0f7fa;
  color: #00796b;
  border-radius: 3px;
  padding: 2px 8px;
  margin-right: 4px;
  margin-bottom: 2px;
  font-size: 13px;
}
.tag button {
  background: none;
  border: none;
  color: #00796b;
  margin-left: 4px;
  cursor: pointer;
}
</style>