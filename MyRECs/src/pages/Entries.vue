<template>
  <div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <h2>Entries — Add / Import</h2>
      <router-link to="/Home" style="margin-left:auto">Back to Home</router-link>
    </div>

    <div class="inputs">
      <textarea ref="ta" v-model="bulkText" placeholder="One entry per line. Use \n for manual line breaks." @keydown="handleKeydown"></textarea>
      <div class="meta">
        <input v-model="currentCategory" placeholder="Category (sub)" />
        <div style="display:flex;gap:8px">
          <button class="btn" v-if="!editingId" @click="addEntries">Add Entries</button>
          <button @click="saveEdit" v-if="editingId">Save Edit</button>
        </div>

        <div style="margin-top:12px;display:flex;gap:8px">
          <button @click="wrapSelection('em')">Emphasize</button>
          <button @click="wrapSelection('cloze')">Cloze</button>
            <button @click="convertToHalfWidth">ToEng</button>
        </div>
                <div style="display:flex;gap:8px;margin-top:8px">
          <button @click="doExport">Export</button>
          <input type="file" ref="fileEl" style="display:none" @change="onFileImport" />
          <button @click="triggerImport">Import</button>
        </div>
      </div>
    </div>

    <div style="margin-top:18px">
      <small>Tip: select text in the textarea and click Emphasize or Cloze to insert markers.</small>
    </div>
  </div>
</template>

<script>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as db from '../db'

export default {
  setup() {
    const bulkText = ref('')
    const currentCategory = ref('')
    const fileEl = ref(null)
    const ta = ref(null)
    const route = useRoute()
    const router = useRouter()
    const editingId = ref(null)

    function splitLines(text) {
      return text.split(/\r?\n/).map(l => l.trim()).filter(Boolean)
    }

    async function addEntries() {
      const lines = splitLines(bulkText.value)
      if (lines.length === 0) return
      const payload = lines.map(l => ({ recs: l, sub: currentCategory.value || '' }))
      await db.addMany(payload)
      bulkText.value = ''
      router.push('/Home')
    }

    async function saveEdit() {
      if (!editingId.value) return
      const plain = { id: Number(editingId.value), recs: bulkText.value, sub: currentCategory.value }
      await db.updateRec(plain)
      router.push('/Home')
    }

    function wrapSelection(type) {
      const el = ta.value
      if (!el) return
      const start = el.selectionStart
      const end = el.selectionEnd
      const sel = el.value.slice(start, end) || ''
      let replacement = ''
      if (type === 'em') replacement = `**${sel}**`
      else replacement = `>[${sel}]<`

      // use setRangeText so browser undo/redo (Ctrl+Z) works
      try {
        el.setRangeText(replacement, start, end, 'end')
      } catch (e) {
        // fallback
        const before = el.value.slice(0, start)
        const after = el.value.slice(end)
        el.value = before + replacement + after
        el.setSelectionRange(start + replacement.length, start + replacement.length)
      }

      // sync Vue model with DOM value (defer to avoid clobbering browser undo stack)
      setTimeout(() => { bulkText.value = el.value }, 0)
      el.focus()
    }
        function convertToHalfWidth() {
          const el = ta.value
          if (!el) return
          const start = el.selectionStart
          const end = el.selectionEnd
          const sel = el.value.slice(start, end) || el.value
          const converted = toHalfWidth(sel)

          try {
            // replace selection or whole value while preserving undo
            if (start === end) {
              el.setRangeText(converted, 0, el.value.length, 'end')
            } else {
              el.setRangeText(converted, start, end, 'end')
            }
          } catch (e) {
            // fallback
            if (start === end) el.value = converted
            else el.value = el.value.slice(0, start) + converted + el.value.slice(end)
          }

          // defer model sync so browser undo (Ctrl+Z) is preserved
          setTimeout(() => { bulkText.value = el.value }, 0)
          el.focus()
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

    function triggerImport() { fileEl.value && fileEl.value.click() }

    async function onFileImport(e) {
      const f = e.target.files && e.target.files[0]
      if (!f) return
      const txt = await f.text()
      try {
        await db.importJSON(txt)
        alert('Import successful')
        router.push('/Home')
      } catch (err) {
        alert('Import failed: ' + err.message)
      }
      e.target.value = ''
    }

    async function doExport() {
      const json = await db.exportJSON()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'myrecs-backup.json'
      a.click()
      URL.revokeObjectURL(url)
    }

    // Clear all removed per request

    onMounted(async () => {
      // if editing id provided via query, load it
      const edit = route.query.edit
      if (edit) {
        const rec = await db.getRec(Number(edit))
        if (rec) {
          editingId.value = rec.id
          bulkText.value = rec.recs
          currentCategory.value = rec.sub || ''
        }
      }
    })

    return { bulkText, currentCategory, addEntries, fileEl, triggerImport, onFileImport, doExport, wrapSelection, ta, editingId, saveEdit, handleKeydown, convertToHalfWidth }
  }
}
</script>

<style scoped>
.inputs textarea{min-height:200px}
</style>
