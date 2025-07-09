import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    // No specific exclusions or inclusions needed for lodash or recharts anymore
    // as they are being removed/replaced.
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    commonjsOptions: {
      // No specific namedExports or transformMixedEsModules needed for lodash anymore.
    },
  },
});
