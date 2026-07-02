import { createRouter, createWebHashHistory } from 'vue-router'
import Home from './pages/Home.vue'
import Entries from './pages/Entries.vue'
import Single from './pages/Single.vue'

const routes = [
  { path: '/', redirect: '/Home' },
  { path: '/Home', component: Home },
  { path: '/Single/:id?', component: Single },
  { path: '/Entries', component: Entries }
]

const router = createRouter({ history: createWebHashHistory(), routes })
export default router
