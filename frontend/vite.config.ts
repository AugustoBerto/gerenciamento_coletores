import { defineConfig } from 'vite';
import vue from '@vitejs/plugin-vue';
import path from 'path';

export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/gerenciamento_coletores/',
  plugins: [vue()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    host: '0.0.0.0',
  },
});
