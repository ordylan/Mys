
<template>
  <div>
    <h2>Generate Test Paper</h2>
    <div>
      <label>Filter by subject:</label>
      <select v-model="filter.subject_code">
        <option value="">All</option>
        <option v-for="s in subjects" :key="s.value" :value="s.value">{{ s.label }}</option>
      </select>
      <label>Knowledge Point:</label>
      <input v-model="filter.kps" placeholder="Filter by knowledge point" />
      <button @click="fetch">Filter</button>
    </div>
    <div v-if="questions.length">
      <div v-for="q in questions" :key="q.id">
        <input type="checkbox" v-model="selected" :value="q.id" />
        <img :src="q.img_path" style="max-width: 120px;" />
        <span>{{ subjectLabel(q.subject_code) }} | {{ q.kps }}</span>
      </div>
      <button @click="generate" :disabled="selected.length === 0">Generate Paper</button>
    </div>
    <div v-if="paper.length">
      <h3>Test Paper Preview</h3>
      <div v-for="img in paper" :key="img">
        <img :src="img" style="max-width: 300px;" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { listRecords, generatePaper } from '../api';

const subjects = [
  { value: 12, label: 'Mathematics' },
  { value: 14, label: 'Physics' },
  { value: 15, label: 'Chemistry' },
  { value: 18, label: 'Biology' },
  { value: 11, label: 'Chinese' },
  { value: 13, label: 'English' },
];

const filter = ref({ subject_code: '', kps: '' });
const questions = ref([]);
const selected = ref([]);
const paper = ref([]);

function subjectLabel(code) {
  const s = subjects.find(s => s.value == code);
  return s ? s.label : code;
}

async function fetch() {
  questions.value = (await listRecords(filter.value)).data.rows || [];
}
fetch();

async function generate() {
  const res = await generatePaper(selected.value);
  paper.value = res.data.items || [];
}
</script>