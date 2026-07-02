<template>
  <div>
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:12px">
      <h2>This is my Record</h2>
      <div style="margin-left:auto;display:flex;gap:8px;align-items:center">
        <label>Filter tag:</label>
        <input v-model="filter" placeholder="sub tag" />
       <!-- <button class="btn" @click="toggleAll">{{ allRevealed ? 'Collapse' : 'Expand' }}</button>
        <button class="btn" @click="toggleEditMode">{{ showControls ? 'Done' : 'Edit' }}</button>
        <button class="btn" @click="pickRandom">Random</button>
      --></div>
    </div>

    <div class="list">
      <div v-if="selected" class="entry">
        <div class="left">
          <div class="meta-row">
            <strong>{{selected.sub || '(uncategorized)'}} </strong>
            <small style="margin-left:10px;color:#888">#{{selected.id}}</small>
          </div>
          <div class="content"><EntryDisplay :text="selected.recs" /></div>
        </div>
        <div v-if="showControls" style="display:flex;flex-direction:column;gap:6px;margin-left:12px">
          <router-link :to="{ path: '/Entries', query: { edit: selected.id } }"><button>Edit</button></router-link>
          <button @click="remove(selected.id)">Delete</button>
        </div>
      </div>

      <div v-else style="color:#666">No matching entries.</div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import * as db from '../db'
import EntryDisplay from '../components/EntryDisplay.vue'

export default {
  components: { EntryDisplay },
  setup() {
    const route = useRoute()
    const router = useRouter()
    const recs = ref([])
    const filter = ref('')
    const showControls = ref(false)
    const selected = ref(null)
    const allRevealed = ref(false)

    async function refresh() {
      const all = await db.getAll()
      recs.value = all.slice().reverse()
      await handleRouteParam()
    }

    async function handleRouteParam() {
      const idParam = route.params.id
      if (idParam) {
        const found = recs.value.find(r => String(r.id) === String(idParam))
        selected.value = found || null
        return
      }
      // no id provided — navigate to a random existing id (from filtered list)
      const arr = filtered.value
      if (!arr.length) { selected.value = null; return }
      const idx = Math.floor(Math.random() * arr.length)
      const choice = arr[idx]
      await router.replace({ path: `/Single/${choice.id}` })
      selected.value = choice
    }

    const filtered = computed(() => {
      if (!filter.value) return recs.value
      return recs.value.filter(r => (r.sub || '').toLowerCase().includes(filter.value.toLowerCase()))
    })

    function chooseInitial() {
      selected.value = filtered.value.length ? filtered.value[0] : null
    }

    function pickRandom() {
      const arr = filtered.value
      if (!arr.length) { selected.value = null; return }
      const idx = Math.floor(Math.random() * arr.length)
      const choice = arr[idx]
      router.push({ path: `/Single/${choice.id}` })
    }

    async function remove(id) {
      if (!confirm('Delete this entry?')) return
      await db.deleteRec(id)
      await refresh()
    }

    function toggleEditMode() { showControls.value = !showControls.value }
    function toggleAll() {
      allRevealed.value = !allRevealed.value
      const appEl = document.querySelector('.app')
      if (appEl) appEl.classList.toggle('all-revealed', allRevealed.value)
    }

    // when filter or recs change, pick first result (and re-handle route)
    watch([filter, recs], () => {
      chooseInitial()
      handleRouteParam()
    })

    // react to route id changes (e.g., manual nav)
    watch(() => route.params.id, () => {
      handleRouteParam()
    })

    onMounted(() => refresh())

    return { recs, filter, selected, pickRandom, remove, showControls, toggleEditMode, allRevealed, toggleAll }
  }
}
</script>

<style scoped>
/* reuse some styles from Home */
.list{margin-top:12px}
</style>
