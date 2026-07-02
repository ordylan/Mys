<template>
  <div>
    <h2>All my FQs</h2>

    <div class="controls">
      <label>Subject:
        <select v-model="filter.subject_code">
          <option value="">All</option>
          <option v-for="s in subjects" :key="s.value" :value="s.value">{{ s.label }}</option>
        </select>
      </label>
      <label style="margin-left:12px">Knowledge Point:</label>
      <input v-model="filter.kps" placeholder="Filter by knowledge point" />
      <button @click="applyFilter">Filter</button>
      <button v-if="filterHistory.length" @click="goBack" title="Return to previous filter">Back</button>
      <button v-if="filter.subject_code || filter.kps" @click="clearFilter">Clear</button>
    </div>

    <div v-if="questions.length" class="questions">
      <div v-for="(q, idx) in questions" :key="q.id" class="question-card">
        <div class="q-image-wrap" @click="toggleAnswer(q)">
          <img :src="q._showAnswer ? (q.img_path || q.img_path_original) : (q.img_path_masked || q.img_path)"
               class="q-image" />
        </div>

        <div class="q-body">
          <div class="q-meta">
            <strong>Subject:</strong>
            <a href="#" @click.prevent="filterBySubject(q.subject_code)">{{ subjectLabel(q.subject_code) }}</a>
            <span class="kps">| <strong>KPs:</strong>
              <span v-if="q.kps">
                <span v-for="(kp, i) in splitKps(q.kps)" :key="i" class="kp-tag" @click="filterByKp(kp)">{{ kp }}</span>
              </span>
              <span v-else>—</span>
            </span>
          </div>
          <div class="q-actions">
            <button @click="view(q.id)">Edit</button>
          </div>
        </div>
      </div>
    </div>
    <div v-else class="empty">No questions found.</div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { listRecords } from '../api'
import { useRouter, useRoute } from 'vue-router'

const subjects = [
  { value: 12, label: 'Mathematics' },
  { value: 14, label: 'Physics' },
  { value: 15, label: 'Chemistry' },
  { value: 18, label: 'Biology' },
  { value: 11, label: 'Chinese' },
  { value: 13, label: 'English' },
]

const router = useRouter()
const route = useRoute()
const filter = ref({ subject_code: '', kps: '' })
const questions = ref([])
const filterHistory = ref([])

function subjectLabel(code) { const s = subjects.find(s => s.value == code); return s ? s.label : code }
function splitKps(kps) { if (!kps) return []; return (typeof kps === 'string' ? kps.split('||') : []).filter(Boolean) }

async function load() {
  const params = {}
  if (filter.value.subject_code) params.subject_code = filter.value.subject_code
  if (filter.value.kps) params.kps = filter.value.kps
  const res = await listRecords(params)
  const rows = (res && res.data && res.data.rows) ? res.data.rows : []
  questions.value = rows.map(r => ({ ...r, _showAnswer: false }))
}

function applyFilter() {
  // push current into history for back support
  filterHistory.value.push({ ...filter.value })
  load()
}

function clearFilter() { filter.value = { subject_code: '', kps: '' }; load() }

function goBack() {
  const prev = filterHistory.value.pop()
  if (prev) {
    filter.value = prev
    load()
  }
}

function filterByKp(kp) {
  filterHistory.value.push({ ...filter.value })
  filter.value.kps = kp
  load()
}

function filterBySubject(code) {
  filterHistory.value.push({ ...filter.value })
  filter.value.subject_code = code
  load()
}

function toggleAnswer(q) { q._showAnswer = !q._showAnswer }

function view(id) { router.push({ name: 'edit', params: { id } }) }

onMounted(() => {
  // read query initial filters if present
  if (route.query.subject_code) filter.value.subject_code = route.query.subject_code
  if (route.query.kps) filter.value.kps = route.query.kps
  load()
})
</script>

<style scoped>
.controls { margin-bottom:12px; display:flex; align-items:center; gap:8px }
.questions { display:flex; flex-direction:column; gap:16px }
.question-card { border:1px solid #ddd; padding:12px; display:flex; gap:12px; align-items:flex-start; border-radius:6px }
.q-image-wrap { flex:0 0 420px; display:flex; justify-content:center; align-items:center }
.q-image{ max-width:688px; max-height:520px; object-fit:contain; border:1px solid #111; }
.q-body{ flex:1 }
.kp-tag{ display:inline-block; background:#e0f7fa; color:#00796b; padding:4px 8px; margin-right:6px; margin-left:6px; border-radius:4px; cursor:pointer }
.q-meta a{ color:#007acc; text-decoration:underline; cursor:pointer }
.empty{ color:#666 }
</style>
