<template>
  <div class="modal-backdrop" @click.self="close">
    <div class="modal">
      <div class="modal-actions">
        <button @click="wrapSelection('em')">Emphasize (F1)</button>
        <button @click="wrapSelection('cloze')">Cloze (F2)</button>
        <button @click="convertToHalfWidth">To Half-width</button>
        <button @click="save">Save</button>
        <button @click="close">Cancel</button>
      </div>
      <textarea ref="ta" v-model="localText" rows="8" @keydown="handleKeydown"></textarea>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, nextTick } from 'vue'

export default {
  props: ['modelValue'],
  emits: ['update:modelValue', 'close'],
  setup(props, ctx) {
    const localText = ref(props.modelValue || '')
    const ta = ref(null)

    onMounted(() => {
      if (ta.value) ta.value.focus()
    })

    function wrapSelection(type) {
      const el = ta.value
      if (!el) return
      const start = el.selectionStart
      const end = el.selectionEnd
      const sel = el.value.slice(start, end) || ''
      const replacement = type === 'em' ? `**${sel}**` : `>[${sel}]<`

      try {
        el.setRangeText(replacement, start, end, 'end')
      } catch (e) {
        const before = el.value.slice(0, start)
        const after = el.value.slice(end)
        el.value = before + replacement + after
        nextTick(() => el.setSelectionRange(start + replacement.length, start + replacement.length))
      }

      // defer model sync to avoid clobbering browser undo stack
      setTimeout(() => { localText.value = el.value }, 0)
      nextTick(() => el.focus())
    }

    function convertToHalfWidth() {
      const el = ta.value
      if (!el) return
      const start = el.selectionStart
      const end = el.selectionEnd
      const sel = el.value.slice(start, end) || el.value
      const converted = toHalfWidth(sel)

      try {
        if (start === end) el.setRangeText(converted, 0, el.value.length, 'end')
        else el.setRangeText(converted, start, end, 'end')
      } catch (e) {
        if (start === end) el.value = converted
        else el.value = el.value.slice(0, start) + converted + el.value.slice(end)
      }

      // defer model sync to avoid clobbering browser undo stack
      setTimeout(() => { localText.value = el.value }, 0)
      nextTick(() => el.focus())
    }

    function toHalfWidth(s) {
      const map = {
        '，': ',', '。': '.', '；': ';', '：': ':', '？': '?', '！': '!',
        '（': '(', '）': ')', '【': '[', '】': ']', '「': '"', '」': '"', '『': '"', '』': '"',
        '“': '"', '”': '"', '‘': "'", '’': "'",
        '、': ',', '—': '-', '–': '-', '～': '~', '％': '%', '＋': '+', '＝': '=', '＠': '@', '＆': '&', '＃': '#',
        '＜': '<', '＞': '>', '／': '/', '＼': '\\', '｜': '|', '＿': '_'
      }
      return s.split('').map(ch => map[ch] || ch).join('')
    }

    function handleKeydown(e) {
      if (e.key === 'F1') {
        e.preventDefault()
        wrapSelection('em')
      } else if (e.key === 'F2') {
        e.preventDefault()
        wrapSelection('cloze')
      }
    }

    function save() {
      ctx.emit('update:modelValue', localText.value)
      ctx.emit('close')
    }

    function close() {
      ctx.emit('close')
    }

    return { localText, ta, wrapSelection, save, close, handleKeydown, convertToHalfWidth }
  }
}
</script>

<style scoped>
.modal-backdrop{position:fixed;inset:0;background:rgba(0,0,0,0.3);display:flex;align-items:center;justify-content:center}
.modal{background:#fff;padding:16px;border-radius:6px;max-width:640px;width:90%}
.modal-actions{display:flex;gap:8px;margin-bottom:8px}
textarea{width:100%;font-family:inherit}
</style>
