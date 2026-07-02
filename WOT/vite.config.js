import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'node:path'

export default defineConfig({
  plugins: [vue(),
    
 /*   {
      name: 'png-placeholder-fallback',
      resolveId(id) {
    
        if (/^core\/.+\.png$/.test(id)) {
          return path.resolve(__dirname, 'public/core/placeholder-item.png')
        }
      }
    }
      */],base: '/MyKPs/WOT/'
})
