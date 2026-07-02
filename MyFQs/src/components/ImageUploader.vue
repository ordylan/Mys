<template>
  <div class="uploader">
    <input type="file" accept="image/*" @change="onFile" multiple />
    <div class="previews">
      <div v-for="(p, i) in previews" :key="i" class="preview">
        <img :data-src="p" @lazyload-complete="onImageLoad" @lazyload-error="onImageError" />
      </div>
    </div>
  </div>
</template>

<script>
import { triggerLazyLoad, setupLazyImage } from '../utils/lazyLoad'

export default {
  name: 'ImageUploader',
  data() { return { previews: [] } },
  methods: {
    onFile(e) {
      const files = Array.from(e.target.files || [])
      const toJpegDataUrl = (dataUrl, quality = 0.85) => new Promise((resolve) => {
        const img = new Image()
        img.onload = () => {
          const canvas = document.createElement('canvas')
          canvas.width = img.naturalWidth
          canvas.height = img.naturalHeight
          const ctx = canvas.getContext('2d')
          ctx.drawImage(img, 0, 0)
          const q = quality
          const jpeg = canvas.toDataURL('image/jpeg', q)
          resolve(jpeg)
        }
        img.onerror = () => resolve(dataUrl)
        img.src = dataUrl
      })

      const readers = files.map(f => new Promise(res => {
        const r = new FileReader()
        r.onload = async ev => {
          const orig = ev.target.result
          const jpeg = await toJpegDataUrl(orig)
          res({ name: f.name.replace(/\.[^.]+$/, '.jpg'), data: jpeg })
        }
        r.readAsDataURL(f)
      }))
      Promise.all(readers).then(items => {
        this.previews = items.map(i => i.data)
        this.$emit('uploaded', items)
        // 图片加载完成后触发懒加载
        this.$nextTick(() => {
          triggerLazyLoad()
        })
      })
    },
    onImageLoad(event) {
      // 图片懒加载完成后的处理
      console.log('Image lazy loaded successfully:', event.detail.src)
    },
    onImageError(event) {
      // 图片加载失败处理
      console.warn('Image lazy load failed:', event.detail.src)
    }
  },
  mounted() {
    // 组件挂载后初始化懒加载
    this.$nextTick(() => {
      triggerLazyLoad()
    })
  }
}
</script>

<style scoped>
.previews { display:flex; gap:8px; margin-top:8px }
.preview img{ max-width:160px; max-height:120px; object-fit:contain }
</style>