import * as idb from './idb'
import exploreLogic from './exploreLogic'

let _timer = null
let _intervalMs = 1 * 1000
let _running = false

export function startExploreDaemon(intervalMs = 1000){
  if(_timer) return
  _intervalMs = intervalMs
  // run immediately then set interval
  processOnce().catch(e=> console.error('exploreDaemon initial run failed', e))
  _timer = setInterval(()=> processOnce().catch(e=> console.error('exploreDaemon run failed', e)), _intervalMs)
}

export function stopExploreDaemon(){ if(_timer){ clearInterval(_timer); _timer=null } }

async function processOnce(){
  if(_running) return
  _running = true
  try{
    const s = await idb.statusesGetAll()
    const now = Date.now()
    for(const k of Object.keys(s||{})){
      try{
        const v = s[k]
        const state = (v && v.state) || v
        const finish = v && v.finish
        if(state === 'exploring' && finish && finish <= now){
          // mark done with finish preserved
          await idb.statusesPut(k, { state: 'done', finish })
          // award processing: produce a single mailbox entry containing area, items and gained exp
          try{
            const parts = k.split('|')
            const houseId = parts[0]
            const floorIdx = Number(parts[1])
            const roomIdx = Number(parts[2])
            const expVal = ((s.user && s.user.exp) || 0)
            const awards = await exploreLogic.pickAwardsByExp(expVal)
            const roomDesc = `${houseId} - floor ${floorIdx}, room ${roomIdx}`
            // add items to collections
            for(const a of awards){ try{ await idb.collectionsAdd(a.id, a.qty || 1) }catch(e){ console.error('collectionsAdd failed in daemon', e) } }
            // compute experience
            let gained = 0
            try{
              const cres = await fetch(import.meta.env.BASE_URL + 'core/collections.json')
              const cdata = (cres.ok) ? await cres.json() : null
              const cfg = (cdata && cdata.config) || {}
              const qualityExp = cfg.qualityExp || { "1":1,"2":3,"3":5,"4":10,"5":20 }
              const defaultExp = Number(cfg.defaultExploreExp || 5)
              gained = defaultExp
              for(const a of awards){ const tier = String(a.qualityTier || 1); const per = Number(qualityExp[tier] || 0); gained += (per * (a.qty || 1)) }
            }catch(e){ console.error('exp calc failed in daemon', e); gained = Number(5) }
            // persist user exp into idb.user (do not rely on Pinia here)
            try{
              const curUser = (s.user) || { exp: 0 }
              curUser.exp = (curUser.exp || 0) + gained
              await idb.statusesPut('user', curUser)
            }catch(e){ console.error('persisting user exp failed', e) }
            // build single mailbox message; use exploration finish time as message `time` (avoid collisions)
            const baseTime = (finish && Number(finish)) || Date.now()
            const uniqueTime = baseTime + Math.floor(Math.random()*1000)
            const msg = {
              time: uniqueTime,
              title: `Exploration Complete: ${roomDesc}! `,
              area: roomDesc,
              items: awards,
              gainedExp: gained,
              body: `You explored ${roomDesc} and found: ${awards.map(a=> a.name + ' x'+a.qty).join(', ')}. Gained ${gained} EXP.`
            }
            await idb.mailboxAdd(msg)
          }catch(e){ console.error('explore award processing failed', e) }
        }
      }catch(e){ console.error('processing status key failed', e) }
    }
  }catch(e){ console.error('exploreDaemon processOnce failed', e) }
  finally{ _running = false }
}
