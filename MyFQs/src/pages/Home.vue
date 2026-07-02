<template>
  <div>
    <h2>Step 1: Upload Original Image</h2>
    <input type="file" accept="image/*" @change="onFileChange" />
    <div v-if="imageUrl">
      <h3>Draw bounding boxes for each question area</h3>
              <button @click="confirm" :disabled="boxes.length===0">Next!! </button>
      <BoundingBoxSelector :image="imageUrl" :boxes="boxes" @update:boxes="boxes = $event" />
      <div style="margin-top:8px">
      <!--<button @click="removeLastBox" :disabled="boxes.length===0">Remove Last Box</button>-->

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { uploadImage } from '../api'
import { useRouter } from 'vue-router'
import BoundingBoxSelector from '../components/BoundingBoxSelector.vue'

const imageUrl = ref('')
const file = ref(null)
const boxes = ref([])
const router = useRouter()

function onFileChange(e) {
  const f = e.target.files[0]
  if (!f) return
  file.value = f
  imageUrl.value = URL.createObjectURL(f)
  boxes.value = []
}

function removeLastBox() { boxes.value.pop() }

async function confirm() {
  const res = await uploadImage(file.value)
  const imgPath = res.data.path
  router.push({ name: 'process', query: { imgPath, boxes: JSON.stringify(boxes.value) } })
}
</script>
