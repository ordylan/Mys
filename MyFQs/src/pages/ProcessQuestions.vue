<template>
  <div v-if="croppedImages.length">
    <h2>Process Single Questions ({{ currentIdx + 1 }}/{{ croppedImages.length }})</h2>
    <div style="display:flex; gap:16px; align-items:flex-start">
      <div>
      <!--  <img :src="croppedImages[currentIdx]" style="max-width:480px; display:block" />-->
        <BoundingBoxSelector :image="croppedImages[currentIdx]" :boxes="answerBoxes" @update:boxes="answerBoxes = $event" />
      </div>
      <div style="min-width:220px">
        <QuestionAttributeForm v-model="attr" />
        <div style="margin-top:12px">
          <button @click="save" :disabled="saving">Save This Question</button>
        </div>
      </div>
    </div>
  </div>
  <div v-else>
    <p>Preparing cropped questions...</p>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import BoundingBoxSelector from '../components/BoundingBoxSelector.vue'
import QuestionAttributeForm from '../components/QuestionAttributeForm.vue'
import { saveRecord } from '../api'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()
// Accept payload via sessionStorage key `process_payload_<id>` to avoid long query strings.
let imgPath = route.query.imgPath
let boxes = []
const payloadKey = route.query.key
if (payloadKey) {
  try {
    const raw = sessionStorage.getItem(payloadKey)
    if (raw) {
      const p = JSON.parse(raw)
      imgPath = p.imgPath || imgPath
      boxes = p.boxes || []
    }
  } catch (e) {}
} else if (route.query.boxes) {
  try {
    // parse and, if long, move into sessionStorage and clean URL
    const parsed = JSON.parse(route.query.boxes)
    boxes = parsed || []
    const serialized = JSON.stringify({ imgPath: route.query.imgPath, boxes })
    if (serialized.length > 200) {
      const key = 'process_payload_' + Date.now()
      sessionStorage.setItem(key, serialized)
      // replace URL to remove large query values and keep only key
      router.replace({ name: 'process', query: { key } })
    }
  } catch (e) {
    boxes = []
  }
}

const croppedImages = ref([])
const currentIdx = ref(0)
const answerBoxes = ref([])
const attr = ref({ subject_code: 12, kps: '' })
const saving = ref(false)

onMounted(async () => {
  // Request backend to crop the uploaded image per box and return cropped image URLs
  try {
    const { cropBoxes } = await import('../api')
    const res = await cropBoxes(imgPath, boxes)
    const j = res.data || res
    if (j && j.success && Array.isArray(j.crops)) croppedImages.value = j.crops
    else croppedImages.value = boxes.map(() => imgPath)
  } catch (e) {
    croppedImages.value = boxes.map(() => imgPath)
  }
})

async function save() {
  saving.value = true
  const key_coords = answerBoxes.value.map(b => [b.x1, b.y1, b.x2, b.y2, b.imgW || 0, b.imgH || 0].join(',')).join('|')
  const data = { img_path: croppedImages.value[currentIdx.value], key_coords, subject_code: attr.value.subject_code, kps: attr.value.kps }
  await saveRecord(data)
  answerBoxes.value = []
  attr.value = { subject_code: 12, kps: '' }
  if (currentIdx.value < croppedImages.value.length - 1) currentIdx.value++
  else router.push({ name: 'questions' })
  saving.value = false
}
</script>
