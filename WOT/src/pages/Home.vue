<template>
  <div class="page home">
    <h1>Wind’Ordylan Town</h1>
    <div class="user-status">
      <div class="lvl">Lv: {{ user.level }}</div>
      <div class="xp-bar">
        <div class="xp-fill" :style="{width: xpPercent + '%'}"></div>
      </div>
      <div class="xp-text">Experience: {{ user.exp }} / {{ nextLevelExp }}</div>
    </div>
    <div class="today-status">
      <div class="today-label">{{ todayProgress.done }} / {{ todayProgress.max }} <span v-if="todayProgress.negative">({{ todayProgress.raw }})</span></div>
      <div class="today-bar"><div class="today-fill" :style="{width: (todayProgress.max? Math.round((todayProgress.done / todayProgress.max)*100):0) + '%'}"></div></div>
    </div>
    <div class="map-wrap2">
      <object type="image/svg+xml" data="maps/Wind’Ordylan.svg" class="map-svg"></object>
    </div>

    <div class="towns">
      <h2>Districts to Explore</h2>
      <p class="note">None</p>
      <ul>
        <li v-for="(d, idx) in districts" :key="idx">
          <a href="#" @click.prevent="openDistrict(d)">{{ d }}</a>
        </li>
      </ul>
    </div>
    
    <div class="mailbox-trigger-wrap">
      <div class="mailbox-trigger" @click="openMailbox">
        <img :src="baseUrl + 'core/mail.png'" alt="mail" class="mail-icon" @error="onMailError" />
        <div class="mail-label">MailBox</div>
        <div class="mail-count" v-if="messages.length">{{ messages.length }}</div>
      </div></div>


    <div class="mailbox-trigger-wrap">
       <div class="mailbox-trigger" @click="openBuildMode">
       <img :src="baseUrl + 'core/build.png'" alt="build" class="mail-icon" @error="onMailError" />
         <div class="mail-label">My House</div>
    </div>

    <div v-if="mailboxOpen" class="modal-overlay" @click="closeMailbox">
      <div class="modal-box" @click.stop>
        <button class="modal-close" @click="closeMailbox">✕</button>
        <h2>Mailbox</h2>
        <div v-if="messages.length===0" class="empty">No messages</div>
        <div v-else class="mail-list">
          <div class="mail-item" v-for="(m,i) in messages" :key="m.time">
            <div class="mail-left">
              <!--临时使用邮件图标-->
              <img :src="baseUrl + 'core/mail.png'" @error="onThumbError" />
            </div>
            <div class="mail-right">
              <strong>{{ m.title }}</strong>
              <div class="mail-time">{{ new Date(m.time).toLocaleString() }}</div>
             <!--<div v-if="m.area" class="mail-area">Area: {{ m.area }}</div>--> 
             <div v-if="typeof m.gainedExp === 'number'" class="mail-exp">Gained {{ m.gainedExp }} EXP, and Found: </div>
              <div v-if="m.items && m.items.length" class="mail-items">
                <div v-for="it in m.items" :key="it.id">{{ it.name }} x{{ it.qty }}</div>
              </div>
             <!--  <div class="mail-body" v-if="m.body">{{ m.body }}</div>-->
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

    </div>
</template>

<script>
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useUserStore } from '../stores/user'

export default {
  setup() {
    const districts = ref([])

    onMounted(async () => {
      try {
        const res = await fetch(import.meta.env.BASE_URL + 'maps/Wind’Ordylan.json')
        const data = await res.json()

        // Find the GeometryCollection with id 'districts' and extract each geometry.name
        const geomCollection = (data.features || []).find(f => f.id === 'districts' || (f.type === 'GeometryCollection' && f.id === 'districts'))
        if (geomCollection && Array.isArray(geomCollection.geometries)) {
          districts.value = geomCollection.geometries.map(g => g.name).filter(Boolean)
        } else {
          districts.value = []
        }
      } catch (e) {
        console.error('Failed to load map JSON', e)
        districts.value = []
      }
    })
    const router = useRouter()
    const user = useUserStore()
    const messages = ref([])
    const mailboxOpen = ref(false)
    const baseUrl = import.meta.env.BASE_URL
    let mailboxTimer = null
    const dailyConfig = ref({})
    function handleKeyDown(event) {
      if (event.key === 'q' || event.key === 'Q') {
        openBuildMode()
      }
    }
    onMounted(async ()=>{
      window.addEventListener('keydown', handleKeyDown)
      try{ await user.initUser() }catch(e){}
      // load collections config
      try{
        const cres = await fetch(import.meta.env.BASE_URL + 'core/collections.json')
        if(cres.ok){ const cdata = await cres.json(); dailyConfig.value = (cdata && cdata.config) || {} }
      }catch(e){}
      const idb = await import('../lib/idb')
      try{ messages.value = await idb.mailboxAll() }catch(e){ messages.value = [] }
      mailboxTimer = setInterval(()=> idb.mailboxAll().then(list=> messages.value = list).catch(()=>{}), 2000)
    })

    async function clearMailbox(){
      const idb = await import('../lib/idb')
      await idb.mailboxClear()
      messages.value = []
    }

    function openMailbox(){ mailboxOpen.value = true }
    function closeMailbox(){ mailboxOpen.value = false }

    const placeholderUrl = import.meta.env.BASE_URL + 'core/placeholder-item.png'
    function onMailError(e){ e.target.src = placeholderUrl }
    function onThumbError(e){ e.target.src = placeholderUrl }

    function openBuildMode(){
      router.push({ name: 'Build' })
    }

    const nextLevelExp = computed(()=>{
      const lvl = user.level || 1
      const cfg = dailyConfig.value || {}
      const byLevel = cfg.exploreDrawsByLevel || {}
      const v = byLevel[String(lvl)]
      if (v && typeof v.expMax === 'number') return v.expMax
      return 0
    })

    const todayProgress = computed(()=>{
      const cfg = dailyConfig.value || {}
      const dailyMap = cfg.dailyMaxByLevel || {}
      const dailyMax = Number(dailyMap[String(user.level)] || dailyMap['1'] || 5)
      const ecRaw = user.exploreCount
      const ec = Number(ecRaw)
      const negative = Number.isFinite(ec) && ec < 0
      if(negative){ return { done: 0, max: dailyMax, raw: ecRaw, negative: true } }
      const done = Math.max(0, Number.isFinite(ec) ? ec : 0)
      return { done, max: dailyMax, raw: ecRaw, negative: false }
    })
    const xpPercent = computed(()=>{
      const lvl = user.level || 1
      const cfg = dailyConfig.value || {}
      const byLevel = cfg.exploreDrawsByLevel || {}
      const v = byLevel[String(lvl)] || {}
      const prev = typeof v.expMin === 'number' ? v.expMin : 0
      const next = (typeof v.expMax === 'number') ? v.expMax : (prev + 1)
      const raw = ((user.exp - prev) / (next - prev)) * 100
     // const val = Number.isFinite(raw) ? Math.max(0, Math.min(100, raw)) : 0
     const val = (user.exp / next) * 100
     return Number(val.toFixed(2))
    })

    onUnmounted(()=>{ if(mailboxTimer) clearInterval(mailboxTimer); window.removeEventListener('keydown', handleKeyDown) })

    function openDistrict(name) {
      if (!name) return
      if (name === 'Castelder') {
        router.push({ name: 'Collections' })
        return
      }
      if (name.includes('Roradosi') || name === 'Roradosi Market') {
        router.push({ name: 'Market' })
        return
      }
      const id = name.replace(/\s+/g, '')
      router.push({ name: 'Explore', params: { town: id } })
    }

    return { districts, openDistrict, messages, clearMailbox, mailboxOpen, openMailbox, closeMailbox, onMailError, onThumbError, user, xpPercent, nextLevelExp, baseUrl, todayProgress, openBuildMode }
  }
}
</script>

<style scoped>
.user-status{ display:flex; align-items:center; gap:12px; margin:12px 0 }
.user-status .lvl{ font-weight:600 }
.xp-bar{ width:220px; height:12px; background:#eee; border-radius:8px; overflow:hidden }
.xp-fill{ height:100%; background:linear-gradient(90deg,#7cc7ff,#6abf8f); }
.xp-text{ color:#555; font-size:12px }

.mailbox-trigger-wrap{ margin:14px 0 }
.mailbox-trigger{ width:96px; text-align:center; cursor:pointer }
.mail-icon{ width:64px; height:64px; object-fit:contain; display:block; margin:0 auto }
.mail-label{ font-size:12px; margin-top:6px }
.mail-count{ position:relative; top:-62px; right:-28px; display:inline-block; background:#c33; color:#fff; padding:2px 6px; border-radius:12px; font-size:12px }

/* reuse modal styles similar to Collections */
.modal-overlay{ position:fixed; inset:0; background:rgba(0,0,0,0.5); display:flex; align-items:center; justify-content:center; z-index:60 }
.modal-box{ background:#fff; border-radius:10px; width:min(720px,95%); max-width:720px; padding:18px; box-shadow:0 10px 30px rgba(0,0,0,0.3); position:relative }
.modal-close{ position:absolute; right:10px; top:10px; border:0; background:transparent; font-size:18px; cursor:pointer }
.mail-list{ max-height:60vh; overflow:auto; display:flex; flex-direction:column; gap:12px }
.mail-item{ display:flex; gap:12px; border-bottom:1px solid #eee; padding-bottom:8px }
.mail-left img{ width:72px; height:72px; object-fit:cover; border-radius:6px }
.mail-right .mail-time{ font-size:12px; color:#666 }
.mail-body{ margin-top:6px }
.empty{ color:#666; margin-top:8px }
.mail-area{ font-size:13px; color:#333; margin-top:6px }
.mail-items{font-weight:400}
.mail-items div{ padding:2px 0 }
.mail-exp{font-weight:400 }
.today-status{ margin:8px 0 12px 0 }
.today-label{ font-size:13px; color:#444; margin-bottom:6px }
.today-bar{ width:220px; height:8px; background:#eee; border-radius:6px; overflow:hidden }
.today-fill{ height:100%; background:linear-gradient(90deg,#ffd27c,#ff9b6a) }
</style>
