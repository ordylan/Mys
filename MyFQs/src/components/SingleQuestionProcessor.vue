<template>
  <div class="sq-processor">
    <h3>Processing Question {{ index+1 }} / {{ total }}</h3>
    <div class="image-row">
      <BoundingBoxSelector :image="img" :boxes="answerBoxes" @update:boxes="answerBoxes = $event" />
    </div>

    <div class="attrs">
      <subject-selector v-model:modelValue="subject_code" />
      <kps-input v-model:modelValue="kpsList" />
    </div>

    <div class="actions">
      <button @click="saveQuestion">Save This Question</button>
    </div>
  </div>
</template>

<script>
import BoundingBoxSelector from './BoundingBoxSelector.vue'
import SubjectSelector from './SubjectSelector.vue'
import KpsInput from './KpsInput.vue'

export default {
  name: 'SingleQuestionProcessor',
  components: { BoundingBoxSelector, SubjectSelector, KpsInput },
  props: { img: { type: String, required: true }, index: Number, total: Number },
  data() { return { subject_code: 12, kpsList: [], answerBoxes: [] } },
  methods: {
    onConfirmBoxes(boxes) { this.answerBoxes = boxes },
    async saveQuestion() {
      // convert answerBoxes to key_coords (coords relative to this cropped image)
      const coords = this.answerBoxes.map(b => `${b.x1},${b.y1},${b.x2},${b.y2},${b.imgW||0},${b.imgH||0}`).join('|')

      // upload cropped image (this.img is a dataURL)
      const { uploadImage, saveRecord } = await import('../api')

      try {
        // ensure uploaded is JPEG to save size
        const srcBlob = await (await fetch(this.img)).blob()
        const toJpegBlob = (blob) => new Promise((res) => {
          const url = URL.createObjectURL(blob)
          const imgEl = new Image()
          imgEl.onload = () => {
            const canvas = document.createElement('canvas')
            canvas.width = imgEl.naturalWidth
            canvas.height = imgEl.naturalHeight
            const ctx = canvas.getContext('2d')
            ctx.drawImage(imgEl, 0, 0)
            canvas.toBlob((b) => {
              URL.revokeObjectURL(url)
              res(b)
            }, 'image/jpeg', 0.9)
          }
          imgEl.onerror = () => { URL.revokeObjectURL(url); res(blob) }
          imgEl.src = url
        })

        const jpegBlob = await toJpegBlob(srcBlob)
        const fd = new FormData()
        fd.append('file', jpegBlob, 'crop.jpg')
        const upres = await uploadImage(jpegBlob)
        const upjson = upres.data || upres
        if (!upjson.success) return alert('Upload cropped image failed')
        const imgPath = upjson.path || upjson.url || ''

        const payload = { img_path: imgPath, key_coords: coords, subject_code: this.subject_code, kps: this.kpsList.join('||') }
        const res = await saveRecord(payload)
        const data = res.data || res
        if (data.success) this.$emit('saved', data.id)
        else alert('Save failed')
      } catch (e) {
        alert('Save error: ' + e.message)
      }
    }
  }
}
</script>

<style scoped>
.image-row { margin-bottom:12px }
.attrs { display:flex; gap:12px; align-items:center }
.actions { margin-top:12px }
</style>
