<template>
  <div class="page collections">
    <div class="page-header">
      <button class="btn btn-back" @click="goBack">← Back</button>
      <div class="page-title-wrap">
        <h1>Collections</h1>
        <button class="btn btn-toggle" @click="toggleView">{{ showOwnedOnly ? 'Show All' : 'Back to my collections' }}</button>
      </div>
    </div>
    <div v-if="filteredItems.length === 0" class="empty">No collections yet.</div>
    <div v-else class="grid">
      <div class="card" v-for="it in filteredItems" :key="it.id" @click="openItem(it)">
        <div class="thumb-wrap collections-card" :class="'quality-' + (it.qualityTier || 1)">
          <img :src="it.image" class="thumb" @error="onThumbError" />
          <div class="badge">{{ it.amount }}</div>
        </div>
        <div class="label">{{ it.name }}</div>
      </div>
    </div>

    <div v-if="selectedItem" class="modal-overlay" @click="closeModal">
      <div class="modal-box" @click.stop>
        <button class="modal-close" @click="closeModal">✕</button>
        <div class="modal-body">
          <div class="modal-left">
            <div class="thumb-wrap modal-thumb" :class="'quality-' + (selectedDetail.qualityTier || 1)">
              <img :src="selectedItem.image" class="thumb" @error="onThumbError" />
            </div>
          </div>
          <div class="modal-right">
            <h2 class="modal-title">{{ selectedItem.name }}</h2>
            <div class="modal-quality">Quality: <strong>{{ selectedDetail.qualityName }}</strong></div>
            <div class="modal-count">Count: <strong>{{ selectedItem.amount }}</strong></div>
            <p class="modal-desc">{{ selectedDetail.description }}</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'

export default {
  setup() {
    const items = ref([])
    const ownedMap = ref({})
    const selectedItem = ref(null)
    const selectedDetail = ref({ description: '', qualityTier: 1, qualityName: '' })
    const mapRef = {}
    const configRef = ref({ qualityTiers: [] })
    const showOwnedOnly = ref(true)
    const router = useRouter()

    function sortCollections(list) {
      return list.slice().sort((a, b) => {
        const aTier = Number(a.qualityTier || 1)
        const bTier = Number(b.qualityTier || 1)
        if (aTier !== bTier) return aTier - bTier

        const aValue = Number(a.value || 0)
        const bValue = Number(b.value || 0)
        if (aValue !== bValue) return aValue - bValue

        const aName = String(a.name || '')
        const bName = String(b.name || '')
        return aName.localeCompare(bName, undefined, { sensitivity: 'base' })
      })
    }

    onMounted(async () => {
      try {
        const res = await fetch(import.meta.env.BASE_URL + 'core/collections.json')
        const data = await res.json()
        const map = {}
        ;(data.items || []).forEach(i => map[i.id] = i)
        const cfg = (data && data.config) || {}
        Object.assign(mapRef, map)
        configRef.value = cfg
        const idb = await import('../lib/idb')
        const cols = await idb.collectionsGetAll()
        items.value = sortCollections((cols || []).map(c => ({
          id: c.id,
          name: (map[c.id] && map[c.id].name) || c.id,
          amount: c.count || 0,
          fragmentcount: c.fragmentcount || 0,
          image: (map[c.id] && map[c.id].image) ? import.meta.env.BASE_URL + map[c.id].image : import.meta.env.BASE_URL + 'core/placeholder-item.png',
          qualityTier: (map[c.id] && map[c.id].qualityTier) || 1,
          value: (map[c.id] && map[c.id].value) || 0,
        })))
        ownedMap.value = items.value.reduce((acc, item) => {
          acc[item.id] = item.amount
          return acc
        }, {})
      } catch (e) {
        items.value = []
      }
    })

    function goBack(){ try{ router.back() }catch(e){ window.history.back() } }
    function onThumbError(e){ e.target.src = import.meta.env.BASE_URL + 'core/placeholder-item.png' }

    function openItem(it){
      const def = mapRef[it.id] || {}
      selectedItem.value = it
      const tier = def.qualityTier || it.qualityTier || 1
      const qName = (configRef.value.qualityTiers || []).find(q => q.tier === tier)
      selectedDetail.value = {
        description: def.description || '',
        qualityTier: tier,
        qualityName: qName ? qName.name : ('Tier ' + tier)
      }
    }

    function closeModal(){ selectedItem.value = null }

    function toggleView(){ showOwnedOnly.value = !showOwnedOnly.value }

    const filteredItems = computed(() => {
      if (!showOwnedOnly.value) {
        return sortCollections(Object.values(mapRef).map(def => ({
          id: def.id,
          name: def.name || def.id,
          amount: ownedMap.value[def.id] || 0,
          fragmentcount: 0,
          image: def.image ? import.meta.env.BASE_URL + def.image : import.meta.env.BASE_URL + 'core/placeholder-item.png',
          qualityTier: def.qualityTier || 1,
          value: def.value || 0,
        })))
      }
      return sortCollections(items.value)
    })

    return { items, goBack, onThumbError, openItem, closeModal, selectedItem, selectedDetail, showOwnedOnly, toggleView, filteredItems }
  }
}
</script>

<style scoped>
.grid{ display:grid; grid-template-columns: repeat(auto-fill, minmax(96px,1fr)); gap:12px; margin-top:12px }
.card{ text-align:center; font-size:12px }
.thumb-wrap{ position:relative; width:96px; height:96px; margin:0 auto }
.thumb{ width:100%; height:100%; object-fit:cover; border-radius:6px; border:1px solid #ddd }
.badge{ position:absolute; right:4px; bottom:4px; background:#222; color:#fff; padding:2px 6px; border-radius:10px; font-size:11px }
.label{ margin-top:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.btn-back{ margin-bottom:8px }
.empty{ color:#666; margin-top:8px }
.page-header{ display:flex; align-items:center; justify-content:flex-start; gap:12px; margin-bottom:12px }
.page-title-wrap{ display:flex; align-items:center; gap:12px }
.btn-toggle{ padding:8px 12px; border:1px solid #888; background:#fff; color:#333; border-radius:6px; cursor:pointer }

/* Modal styles */
.modal-overlay{ position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:60 }
.modal-box{ background:#fff; border-radius:10px; width:min(820px,95%); max-width:820px; padding:18px; box-shadow:0 10px 30px rgba(0,0,0,0.3); position:relative }
.modal-close{ position:absolute; right:10px; top:10px; border:0; background:transparent; font-size:18px; cursor:pointer }
.modal-body{ display:flex; gap:16px }
.modal-left{ width:220px; display:flex; align-items:center; justify-content:center }
.modal-thumb{ width:200px; height:200px }
.modal-thumb .thumb{ border-radius:8px }
.modal-right{ flex:1 }
.modal-title{ margin:0 0 8px 0 }
.modal-desc{ color:#333; margin-top:12px }
.modal-quality, .modal-count{ margin-top:6px; color:#555 }

/* Quality colors */
.quality-1 .thumb, .quality-1.modal-thumb .thumb{ box-shadow:0 0 0 3px rgba(150,150,150,0.12) }
.quality-2 .thumb, .quality-2.modal-thumb .thumb{ box-shadow:0 0 0 3px rgba(80,170,120,0.12) }
.quality-3 .thumb, .quality-3.modal-thumb .thumb{ box-shadow:0 0 0 3px rgba(90,130,230,0.12) }
.quality-4 .thumb, .quality-4.modal-thumb .thumb{ box-shadow:0 0 0 3px rgba(180,80,220,0.12) }
.quality-5 .thumb, .quality-5.modal-thumb .thumb{ box-shadow:0 0 0 4px rgba(220,170,60,0.14) }
</style>
