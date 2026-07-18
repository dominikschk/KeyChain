
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  appType: 'spa',
  build: {
    rollupOptions: {
      input: 'index.html',
      output: {
        manualChunks(id) {
          if (id.includes('node_modules/three') || id.includes('@react-three')) {
            return 'three';
          }
          if (id.includes('imagetracerjs')) {
            return 'imagetracer';
          }
          if (id.includes('vecburner')) {
            return 'vecburner';
          }
        },
      },
    },
    chunkSizeWarningLimit: 900,
  },
});
