import { ref, onMounted, onUnmounted, computed } from 'vue'
<template>
  <div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <h2>Home — MyRECs</h2>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
        <label>Filter:</label>
        <label style="display:flex;align-items:center;gap:6px">
          <input type="radio" name="filterMode" value="tag" v-model="filterMode" /> tag
        </label>
        <label style="display:flex;align-items:center;gap:6px">
          <input type="radio" name="filterMode" value="rec" v-model="filterMode" /> rec
        </label>
        <input v-model="filter" placeholder="search" />
        <button class="btn" @click="toggleAll">{{ allRevealed ? 'Collapse' : 'Expand' }}</button>
        <button class="btn" @click="toggleEditMode">{{ showControls ? 'Done' : 'Edit' }}</button>

      </div>
    </div>

    <div class="list">
      <div v-for="rec in filtered" :key="rec.id" class="entry">
        <div class="left">
          <div class="meta-row">
            <strong>{{rec.sub || '(uncategorized)'}} </strong>
            <small style="margin-left:10px;color:#888">#{{rec.id}}</small>
          </div>
          <div class="content"><EntryDisplay :text="rec.recs" /></div>
        </div>
        <div v-if="showControls" style="display:flex;flex-direction:column;gap:6px;margin-left:12px">
          <router-link :to="{ path: '/Entries', query: { edit: rec.id } }"><button>Edit</button></router-link>
          <button @click="remove(rec.id)">Delete</button>
        </div>
      </div>
    </div>

    <div v-if="cloudModalVisible" class="cloud-modal" @click.self="closeCloudModal">
      <div class="box">
        <h3>Cloud Sync</h3>
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px">
          <label style="min-width:70px">Password:</label>
            <input type="password" v-model="cloudPassword" @input="onCloudPasswordInput" placeholder="password" />
             <button @click="closeCloudModal">Close</button>
        </div>

        <div style="display:flex;gap:8px;margin-bottom:8px">
          <button @click="uploadData">Upload</button>
          <button @click="downloadData">Download</button>
        </div>

        <div style="display:flex;gap:16px">
          <div style="flex:1">
            <h4>Local (preview)</h4>
            <table class="preview-table"><thead><tr><th>ID</th><th>Content</th></tr></thead>
            <tbody><tr v-for="r in localPreview" :key="r.id"><td>{{r.id}}</td><td>{{ r.recs || r.text || r.content || '' }}</td></tr></tbody></table>
          </div>
          <div style="flex:1">
            <h4>Server (preview)</h4>
            <table class="preview-table"><thead><tr><th>ID</th><th>Content</th></tr></thead>
            <tbody><tr v-for="r in serverPreview" :key="r.id"><td>{{r.id}}</td><td>{{ r.recs || r.text || r.content || '' }}</td></tr></tbody></table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import * as db from '../db'
import EntryDisplay from '../components/EntryDisplay.vue'

export default {
  components: { EntryDisplay },
  setup() {
    const recs = ref([])
    const filter = ref('')
    const showControls = ref(false)

    async function refresh() {
      const all = await db.getAll()
      // show newest first
      recs.value = all.slice().reverse()
    }

    // rendering handled by EntryDisplay component

    async function remove(id) {
      if (!confirm('Delete this entry?')) return
      await db.deleteRec(id)
      await refresh()
    }

    const allRevealed = ref(false)
    function toggleEditMode() { showControls.value = !showControls.value }
    function toggleAll() {
      allRevealed.value = !allRevealed.value
      const appEl = document.querySelector('.app')
      if (appEl) appEl.classList.toggle('all-revealed', allRevealed.value)
    }

    onMounted(() => {
      refresh()
      window.addEventListener('open-cloud', openCloudModal)
    })

    onUnmounted(() => {
      window.removeEventListener('open-cloud', openCloudModal)
    })

    // Cloud archive state
    const cloudModalVisible = ref(false)
    const cloudPassword = ref(localStorage.getItem('ON_MyRECs_PWD') || '')
    
      function onCloudPasswordInput() {
        localStorage.setItem('ON_MyRECs_PWD', cloudPassword.value)
      }

    function openCloudModal() {
      cloudModalVisible.value = true
      // fetch server logs preview when password present
      if (cloudPassword.value) {
        setTimeout(() => { showLogComparison() }, 100)
      }
    }

    function closeCloudModal() { cloudModalVisible.value = false }

    function savePassword(pwd) {
      cloudPassword.value = pwd
      localStorage.setItem('ON_MyRECs_PWD', pwd)
    }

    async function getLocalRows() {
      return await db.getAll()
    }

    async function showLogComparison() {
      const local = await getLocalRows()
        localPreview.value = local.slice().reverse().slice(0,10)
      // get server logs
      try {
        const ts = new Date().getTime()
        const res = await fetch(`/MyRECs/CloudRECs.php?op=logs&t=${ts}`, {
          method: 'GET',
          headers: { 'Authorization': `GaoKaoBiSheng ${cloudPassword.value}` }
        })
        if (res.ok) {
            const srv = await res.json()
            serverPreview.value = Array.isArray(srv) ? srv.slice().reverse().slice(0,10) : []
        } else {
          serverPreview.value = []
        }
      } catch (e) { console.error(e); serverPreview.value = [] }
    }

    const localPreview = ref([])
    const serverPreview = ref([])

    // filter mode: 'tag' (search sub) or 'rec' (search raw record text)
    const filterMode = ref('tag')

    async function uploadData() {
      if (!cloudPassword.value) return alert('Please enter password first')
      await showLogComparison()
      if (!confirm('Upload local data to cloud?')) return
      try {
        const rows = await getLocalRows()
        const payload = { stores: { RECs: rows } }
        const ts = new Date().getTime()
        const res = await fetch(`/MyRECs/CloudRECs.php?op=upload&t=${ts}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `GaoKaoBiSheng ${cloudPassword.value}` },
          body: JSON.stringify(payload)
        })
        if (res.ok) { alert('Upload successful') ; closeCloudModal(); } else if (res.status===401) alert('Invalid password')
        else alert('Upload failed')
      } catch (e) { console.error(e); alert('Upload error') }
    }

    async function downloadData() {
      if (!cloudPassword.value) return alert('Please enter password first')
      await showLogComparison()
      if (!confirm('Download cloud data and overwrite local data?')) return
      try {
        const ts = new Date().getTime()
        const res = await fetch(`/MyRECs/CloudRECs.php?op=download&t=${ts}`, {
          method: 'GET',
          headers: { 'Authorization': `GaoKaoBiSheng ${cloudPassword.value}` }
        })
        if (!res.ok) { if (res.status===401) alert('Invalid password'); else alert('Download failed'); return }
        const imported = await res.json()
        if (imported && imported.stores && Array.isArray(imported.stores.RECs)) {
          // overwrite: clear and addMany
          if (!confirm('Confirm: clear local DB and import from cloud?')) return
          await db.clearAll()
          await db.addMany(imported.stores.RECs)
          await refresh()
          alert('Import successful')
          closeCloudModal()
        } else if (imported && imported.rows && Array.isArray(imported.rows)) {
          await db.clearAll()
          await db.addMany(imported.rows)
          await refresh()
          alert('Import successful')
          closeCloudModal()
        } else { alert('No valid data returned') }
      } catch (e) { console.error(e); alert('Download error') }
    }

    const filtered = computed(() => {
      if (!filter.value) return recs.value
      const q = filter.value.toLowerCase()
      if (filterMode.value === 'rec') {
        return recs.value.filter(r => {
          const txt = (r.recs || r.text || r.content || '').toString().toLowerCase()
          return txt.includes(q)
        })
      }
      // default: search tags/sub
      return recs.value.filter(r => (r.sub || '').toLowerCase().includes(q))
    })

    return { recs, refresh, remove, filter, filterMode, filtered, showControls, toggleEditMode, allRevealed, toggleAll,
             cloudPassword, cloudModalVisible, onCloudPasswordInput, openCloudModal, closeCloudModal, savePassword, localPreview, serverPreview, uploadData, downloadData }
  }
}
</script>

<style>
/* Cloud modal simple styling */
.cloud-modal { position: fixed; left:0; top:0; right:0; bottom:0; background: rgba(0,0,0,0.4); display:flex; align-items:center; justify-content:center }
.cloud-modal .box { background:#fff; padding:12px; width:90%; max-width:760px; border-radius:6px; max-height:80vh; overflow-y:auto }
.preview-table { width:100%; border-collapse:collapse }
.preview-table th,.preview-table td{ border:1px solid #ddd; padding:6px }
</style>
