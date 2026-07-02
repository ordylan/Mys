
import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';

export default defineConfig({
  // Production will be deployed under /MyFQs/
  base: '/MyFQs/',
  plugins: [vue()],
  server: {
    proxy: {
      // during dev, forward frontend '/api/*' calls to backend served at http://localhost:8000/MyFQs/api/*
      '/api': {
        target: 'http://localhost:8000/MyFQs/api',
        changeOrigin: true,
        secure: false,
      }
    },
  },
});