<template>
  <div class="page explore">
    <button class="btn btn-back" @click="goBack">← Back</button>
    <h1>Explore: {{ town }}</h1>
    <div v-if="loading">Loading...</div>
    <div v-else>
        <div class="explore-list">
          <ul>
            <li v-for="(h, idx) in houses" :key="h.id">
              <div class="house-card" @click="openHouse(h.id)">
                <div class="map-wrap">
                  <img :src="getThumb(h)" class="house-thumb" @error="onThumbError" alt="thumb" />
                </div>
                  <div class="house-meta">
                    <strong class="house-title">{{ idx+1 }}. {{ h.name }}</strong>
                    <div class="house-progress">
                      <div class="progress-bar"><div class="progress-fill" :style="{width: (getHouseProgress(h).total? Math.round((getHouseProgress(h).done / getHouseProgress(h).total)*100):0) + '%'}"></div></div>
                      <div class="progress-text">{{ getHouseProgress(h).done }} / {{ getHouseProgress(h).total }} <span v-if="getHouseProgress(h).exploring">(exploring)</span></div>
                    </div>
                  </div>
              </div>
            </li>
          </ul>
        </div>
    </div>
  </div>
</template>

<script>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'

export default {
  props: ['town'],
  setup(props) {
    const houses = ref([])
    const loading = ref(true)
    const houseTotals = ref({})
    const statuses = ref({})
    let statusTimer = null

    onMounted(async () => {
      try {
        const res = await fetch(`${import.meta.env.BASE_URL}maps/Wind’Ordylan/${props.town}.json`)
        const data = await res.json()
        houses.value = data.houses || []
        // fetch each house's main.json to learn floors/rooms count
        for (const h of houses.value){
          try{
            const r = await fetch(`${import.meta.env.BASE_URL}maps/Wind’Ordylan/${props.town}/${h.id}/main.json`)
            if(r.ok){
              const md = await r.json()
              const floors = md.floors || []
              let total = 0
              for(const f of floors){ if(Array.isArray(f.rooms)) total += f.rooms.filter(rr => rr && rr.name).length }
              houseTotals.value[h.id] = total
            } else {
              houseTotals.value[h.id] = 0
            }
          }catch(e){ houseTotals.value[h.id] = 0 }
        }
      } catch (e) {
        houses.value = []
      } finally {
        loading.value = false
      }
      // load statuses and start polling for updates (explore/ done keys)
      try{
        const idb = await import('../lib/idb')
        try{ statuses.value = await idb.statusesGetAll() }catch(e){}
        statusTimer = setInterval(async ()=>{ try{ statuses.value = await (await import('../lib/idb')).statusesGetAll() }catch(e){} }, 1000)
      }catch(e){}
    })

    onUnmounted(()=>{ if(statusTimer) clearInterval(statusTimer) })

    const router = useRouter()
    function openHouse(houseId){
      router.push({ name: 'House', params: { town: props.town, houseId } })
    }

    function goBack(){
      router.back()
    }

    function getHouseProgress(h){
      const total = houseTotals.value[h.id] || 0
      let done = 0
      let exploring = false
      const prefix = h.id + '|'
      const s = statuses.value || {}
      for(const k of Object.keys(s||{})){
        if(!k.startsWith(prefix)) continue
        const v = s[k]
        const state = (v && v.state) || v
        if(state === 'done') done++
        if(state === 'exploring') exploring = true
      }
      return { total, done, exploring }
    }

    function onThumbError(e) {
      e.target.src = import.meta.env.BASE_URL + 'core/placeholder-house.svg'
    }

    function getThumb(h) {
      return `${import.meta.env.BASE_URL}maps/Wind’Ordylan/${props.town}/${h.id}/f.svg`
    }

    return {
      houses,
      loading,
      openHouse,
      goBack,
      getHouseProgress,
      onThumbError,
      getThumb
    }
  }
}
</script>

<style scoped>
.house-card{ display:flex; gap:16px; align-items:flex-start; padding:10px; border-radius:8px }
.map-wrap{ flex:0 0 160px; width:160px; height:160px; display:flex; align-items:center; justify-content:center; }
.house-thumb{ width:140px; height:140px; object-fit:contain; border-radius:6px; background:#fafafa; padding:6px; border:1px solid #eee }
.house-meta{ flex:1; min-width:0 }
.house-progress{ margin-top:6px }
.progress-bar{ width:160px; height:10px; background:#eee; border-radius:6px; overflow:hidden }
.progress-fill{ height:100%; background:linear-gradient(90deg,#7cc7ff,#6abf8f) }
.progress-text{ font-size:12px; color:#555; margin-top:4px }
</style>
