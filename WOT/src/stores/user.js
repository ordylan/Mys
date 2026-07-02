import { defineStore } from 'pinia'
import * as idb from '../lib/idb'
import { loadCollections, getLevelForExp } from '../lib/exploreLogic'

export const useUserStore = defineStore('user', {
  state: () => ({
    // store experience; level is computed from exp
    exp: 0,
    initialized: false,
    // daily explore tracking
    exploreDate: null, // YYYY-MM-DD
    exploreCount: 0
  }),
  getters: {
    level: (state) => {
      try{
        return getLevelForExp(state.exp)
      }catch(e){
        console.error('getLevelForExp failed', e)
      }
    },
    exploringSlots: (state) => (state.level + 2)
  },
  actions: {
    setExp(e) { this.exp = e },
    async initUser(){
      try{
        const s = await idb.statusesGetAll()
        const u = s && s.user
        if(u && typeof u.exp === 'number') this.exp = u.exp
        else {
          this.exp = this.exp || 0
        }
        // restore explore tracking
        if(u && typeof u.exploreCount === 'number') this.exploreCount = u.exploreCount || 0
        if(u && typeof u.exploreDate === 'string') this.exploreDate = u.exploreDate || null
        // persist a normalized user record
        await idb.statusesPut('user', { exp: this.exp, exploreDate: this.exploreDate, exploreCount: this.exploreCount })
        // ensure collections/config is loaded so getters can compute level from config
        try{ await loadCollections() }catch(e){ /* ignore load errors; getters will fallback */ }
        this.initialized = true
      }catch(e){ console.error('initUser failed', e) }
    },
    async addExp(amount){
      if(!Number.isFinite(amount)) return
      this.exp = (this.exp || 0) + amount
      try{ await idb.statusesPut('user', { exp: this.exp, exploreDate: this.exploreDate, exploreCount: this.exploreCount }) }catch(e){ console.error('statusesPut failed', e) }
    }
    ,// adjust explore count by delta (can be negative). Resets date if needed.
    async adjustExploreCount(delta=1){
      const today = new Date().toISOString().slice(0,10)
      if(this.exploreDate !== today){
        this.exploreDate = today
        this.exploreCount = 0
      }
      if(!Number.isFinite(delta)) return
      this.exploreCount = (this.exploreCount || 0) + delta
      try{ await idb.statusesPut('user', { exp: this.exp, exploreDate: this.exploreDate, exploreCount: this.exploreCount }) }catch(e){ console.error('statusesPut failed', e) }
      return this.exploreCount
    }
  }
})
