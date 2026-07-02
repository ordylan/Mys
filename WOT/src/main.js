import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createWebHistory } from 'vue-router'
import App from './App.vue'
import routes from './router'
import './assets/styles.css'
import { loadCollections } from './lib/exploreLogic'

const app = createApp(App)
app.use(createPinia())
// preload collections/config so level/exp logic always has config available
loadCollections().catch(()=>{})
// start background explore daemon after Pinia is installed
import('./lib/exploreDaemon').then(mod => mod.startExploreDaemon()).catch(()=>{})
const router = createRouter({ 
  history: createWebHistory(import.meta.env.BASE_URL), 
  routes 
})
app.use(router)
app.mount('#app')