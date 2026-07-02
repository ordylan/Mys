<template>
  <div class="page house">
    <div class="page-header">
      <button class="btn btn-back" @click="goBack">← Back</button>
      <div class="title">{{ town }} — {{ houseId }}</div>
    </div>
    <div v-if="loading">Loading...</div>
    <div v-else>
      <div class="preview-main">
        <img :src="previewSvg" @error="onPreviewError" class="preview-img" />
        <div class="floors">
          <h3>Floors</h3>
          <div v-if="previewData && previewData.floors">
            <button v-for="(f,i) in previewData.floors" :key="i" :class="{active: i===activeFloor}" @click="selectFloor(i)">
              {{ f.level === 0 ? 'B' : (f.level>0? f.level + 'F' : f.level) }}
            </button>
          </div>
        </div>
      </div>

      <div class="rooms">
        <h3>Rooms</h3>
        <div v-if="previewData && previewData.floors && previewData.floors[activeFloor]">
          <table class="rooms-table">
            <thead><tr><th>#</th><th>Name</th><th>Action</th></tr></thead>
              <tbody>
              <tr v-for="(r,ri) in filteredRooms" :key="ri">
                <td>{{ ri+1 }}</td>
                <td>{{ r.name }}</td>
                <td>
                  <button @click="exploreRoom(houseId, activeFloor, ri)" :disabled="getRoomStatus(houseId, activeFloor, ri) !== 'idle'">
                    <span v-if="getRoomStatus(houseId, activeFloor, ri) === 'exploring'">Exploring...</span>
                    <span v-else-if="getRoomStatus(houseId, activeFloor, ri) === 'done'">Completed</span>
                    <span v-else>Explore</span>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else>No rooms on this floor.</div>
        <div class="slots-note">Active explores: {{ countActiveExplores() }} / {{ slots }}</div>
      </div>

    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

export default {
  props: ['town','houseId'],
  setup(props){
    const loading = ref(true)
    const previewData = ref(null)
    const previewSvg = ref('')
  const collectionsItems = ref([])
    const activeFloor = ref(null)
    const statuses = ref({})
    const user = useUserStore()
    const slots = ref(user.level + 2)

    const router = useRouter()
    let pollTimer = null
    onMounted(async ()=>{
      // ensure user data loaded from indexeddb
      try{ await user.initUser() }catch(e){}
      try{
        const res = await fetch(`${import.meta.env.BASE_URL}maps/Wind’Ordylan/${props.town}/${props.houseId}/main.json`)
        if(res.ok) previewData.value = await res.json()
      // load collections.json for award placeholders
      try {
        const cres = await fetch(import.meta.env.BASE_URL + 'core/collections.json')
        if (cres.ok) {
          const cdata = await cres.json()
          collectionsItems.value = (cdata.items && cdata.items.length) ? cdata.items : []
        }
      } catch(e) {}
      }catch(e){ previewData.value = null }
      previewSvg.value = `${import.meta.env.BASE_URL}maps/Wind’Ordylan/${props.town}/${props.houseId}/f.svg`
      // load statuses from idb and start poll to check completions
      const idb = await import('../lib/idb')
      try { statuses.value = await idb.statusesGetAll() } catch(e){}
      // refresh statuses periodically so UI updates; actual completion processing is handled by the app-level daemon
      pollTimer = setInterval(async ()=>{
        try { statuses.value = await idb.statusesGetAll() } catch(e){}
      }, 1000)
      loading.value = false
    })

    onUnmounted(()=>{ if(pollTimer) clearInterval(pollTimer) })

    function selectFloor(i){
      activeFloor.value = i
      const f = (previewData.value && previewData.value.floors && previewData.value.floors[i])
      const lvl = f ? f.level : null
      let name = ''
      if(lvl === 0) name='gf.svg'
      else if(lvl === -1) name='bf.svg'
      else if(lvl === 1) name='1f.svg'
      else if(lvl === 2) name='2f.svg'
      else if(lvl === 3) name='3f.svg'
      else if(lvl === 4) name='4f.svg'
      else if(lvl === 5) name='5f.svg'
      else if(lvl === 6) name='6f.svg'
      else if(lvl === 7) name='7f.svg'
      else if(lvl === 8) name='8f.svg'
      else name='f.svg'
      previewSvg.value = `${import.meta.env.BASE_URL}maps/Wind’Ordylan/${props.town}/${props.houseId}/${name}`
    }

    function getKey(houseId, floorIdx, roomIdx){ return `${houseId}|${floorIdx}|${roomIdx}` }
    function getRoomStatus(houseId, floorIdx, roomIdx){
      const k=getKey(houseId,floorIdx,roomIdx)
      const v = statuses.value[k]
      if(!v) return 'idle'
      return (v && v.state) || v
    }
    function countActiveExplores(){ return Object.values(statuses.value).filter(s=> (s && s.state? s.state==='exploring': s==='exploring')).length }

    async function exploreRoom(houseId,floorIdx,roomIdx){
      const key = getKey(houseId,floorIdx,roomIdx)
      const existing = statuses.value[key]
      const existingState = existing && (existing.state || existing)
      if(existingState === 'exploring') return
      if(existingState === 'done') return
      // check daily limit using explore.json
      try{
        const cres = await fetch(import.meta.env.BASE_URL + 'core/collections.json')
        const cdata = (cres.ok) ? await cres.json() : null
        const cfg = (cdata && cdata.config) || {}
        const dailyMap = cfg.dailyMaxByLevel || {}
        const maxForLevel = Number(dailyMap[String(user.level)] || dailyMap['1'] || 5)
        // ensure user initialized
        try{ await user.initUser() }catch(e){}
        const today = new Date().toISOString().slice(0,10)
        if(user.exploreDate !== today) {
          // reset count in store
          await user.adjustExploreCount(0)
        }
        if((user.exploreCount || 0) >= maxForLevel){ alert('Reached daily explore limit for your level'); return }
      }catch(e){ console.error('failed to check explore limits', e) }
      if(countActiveExplores() >= slots.value){ alert('Reached max concurrent explores'); return }
      const finish = Date.now() + (40 + Math.floor(Math.random()*141)) * 60 * 1000 // 40-180 minutes
     // const finish = Date.now() +  1000  
      statuses.value = { ...statuses.value, [key]: { state: 'exploring', finish } }
      const idb = await import('../lib/idb')
      await idb.statusesPut(key, { state: 'exploring', finish })
      // increment user's daily explore count immediately (click counts regardless of completion)
      try{ await user.adjustExploreCount(1) }catch(e){ console.error('adjustExploreCount failed', e) }
      // do not set timeout here; poll will detect completion even if page closed
    }

    function onPreviewError(e){ e.target.src = import.meta.env.BASE_URL + 'core/placeholder-house.svg' }

    function goBack(){
      try{ router.back() }catch(e){ window.history.back() }
    }

    const filteredRooms = computed(()=>{
      if(previewData.value && previewData.value.floors && activeFloor.value !== null){
        const floor = previewData.value.floors[activeFloor.value]
        if(floor && Array.isArray(floor.rooms)) return floor.rooms.filter(r => r && r.name)
      }
      return []
    })

    return { loading, previewData, previewSvg, activeFloor, selectFloor, getRoomStatus, exploreRoom, countActiveExplores, slots, onPreviewError, filteredRooms, goBack }
  }
}
</script>
