import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": "/home/project/src",
    },
  },
  optimizeDeps: {
    include: [
      '@radix-ui/react-checkbox',
      '@radix-ui/react-label',
      '@radix-ui/react-dialog',
      '@radix-ui/react-icons',
      '@radix-ui/react-scroll-area',
      '@radix-ui/react-select',
      '@radix-ui/react-slot',
      '@radix-ui/react-toast',
      'date-fns',
      'lucide-react',
    ],
  },
});
