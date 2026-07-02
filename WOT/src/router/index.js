import Home from '../pages/Home.vue'
import Explore from '../pages/Explore.vue'
import House from '../pages/House.vue'
import Build from '../pages/Build.vue'
import Collections from '../pages/Collections.vue'
import Market from '../pages/Market.vue'

export default [
  { path: '/', name: 'Home', component: Home },
  { path: '/explore/:town', name: 'Explore', component: Explore, props: true },
  { path: '/explore/:town/house/:houseId', name: 'House', component: House, props: true },
  { path: '/build', name: 'Build', component: Build },
  { path: '/collections', name: 'Collections', component: Collections },
  { path: '/market', name: 'Market', component: Market }
]
