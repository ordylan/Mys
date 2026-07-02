import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import './styles.css'
import 'katex/dist/katex.min.css'

createApp(App).use(router).mount('#app')

// Register service worker for offline support (use relative path so it works under subpaths)
if ('serviceWorker' in navigator) {
	window.addEventListener('load', () => {
		navigator.serviceWorker.register('./sw.js').then(reg => {
			console.log('Service worker registered:', reg.scope)
		}).catch(err => console.warn('Service worker registration failed:', err))
	})
}
