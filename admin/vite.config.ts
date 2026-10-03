import { defineConfig } from 'vite';
export default defineConfig({
  server: { proxy: { '/api': { target: 'http://127.0.0.1:5000', changeOrigin: true } } },
  build: { rollupOptions: { output: { manualChunks: { firebase: ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/storage'], react: ['react', 'react-dom/client'] } } } },
});
