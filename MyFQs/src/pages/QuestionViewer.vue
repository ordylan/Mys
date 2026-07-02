<template>
  <div v-if="data">
    <h2>Question Edit</h2>
    <img 
      :data-src="showAnswer ? data.question_original : data.question_masked" 
      @click="showAnswer = !showAnswer" 
      style="max-width:900px; cursor:pointer" 
      @lazyload-complete="onImageLoad" 
      @lazyload-error="onImageError"
    />
    <div style="margin-top:8px">(click image to toggle answer)</div>
    <div style="margin-top:12px; display:flex; gap:12px; align-items:flex-start">
      <QuestionAttributeForm v-model="formData" />
      <div style="display:flex; flex-direction:column; gap:8px; margin-top:6px">
        <button @click="save">Save</button>
        <button @click="$router.push({ name: 'questions' })">Back to list</button>
      </div>
    </div>

    <div style="margin-top:8px">Subject: {{ subjectLabel(data.subject_code) }} | KPs: {{ data.kps }}</div>
  </div>
  <div v-else>Loading...</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, reactive, watch } from 'vue'
import { getCrops, updateRecord } from '../api'
import { useRoute } from 'vue-router'
import QuestionAttributeForm from '../components/QuestionAttributeForm.vue'
import { triggerLazyLoad, destroyLazyLoad } from '../utils/lazyLoad'

const route = useRoute()
const data = ref(null)
const showAnswer = ref(false)

// Create reactive form data object for proper v-model binding
const formData = reactive({
  subject_code: null,
  kps: ''
})

const subjects = [ { value: 12, label: 'Mathematics' }, { value: 14, label: 'Physics' }, { value: 15, label: 'Chemistry' }, { value: 18, label: 'Biology' }, { value: 11, label: 'Chinese' }, { value: 13, label: 'English' } ]

function subjectLabel(code) {
  const subjects = [ { value: 12, label: 'Mathematics' }, { value: 14, label: 'Physics' }, { value: 15, label: 'Chemistry' }, { value: 18, label: 'Biology' }, { value: 11, label: 'Chinese' }, { value: 13, label: 'English' } ]
  const s = subjects.find(s => s.value == code)
  return s ? s.label : code
}

onMounted(async () => {
  const res = await getCrops(route.params.id)
  data.value = res.data
  // initialize editable fields
  formData.subject_code = data.value.subject_code
  formData.kps = data.value.kps || ''
  
  // 数据加载完成后触发懒加载
  triggerLazyLoad()
})

onUnmounted(() => {
  // 组件销毁时清理懒加载监听器
  destroyLazyLoad()
})

async function save() {
  try {
    const payload = { id: route.params.id, subject_code: formData.subject_code, kps: formData.kps }
    const res = await updateRecord(payload)
    const d = res.data || res
    if (d && d.success) {
      alert('Saved')
      // refresh
      const r2 = await getCrops(route.params.id)
      data.value = r2.data
      formData.subject_code = data.value.subject_code
      formData.kps = data.value.kps || ''
    } else {
      alert('Save failed')
    }
  } catch (e) { alert('Save error: ' + e.message) }
}

function onImageLoad(event) {
  // 图片懒加载完成后的处理
  console.log('Question image loaded:', event.detail.src)
}

function onImageError(event) {
  // 图片加载失败处理
  console.warn('Question image load failed:', event.detail.src)
}
</script>

<style scoped>
.kp-tag { display:inline-block; background:#eef; padding:4px 8px; margin:4px; border-radius:12px }
</style>