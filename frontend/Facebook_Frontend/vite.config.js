import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import process from 'node:process'

// The lockfile is kept current; avoid stale-age warnings when the local clock
// is newer than the latest caniuse-lite publication.
process.env.BROWSERSLIST_IGNORE_OLD_DATA ??= 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**', '**/*.e2e.*'],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['radix-ui', 'cmdk', 'lucide-react'],
          'vendor-data': ['axios', '@microsoft/signalr', 'date-fns'],
          'vendor-media': ['html2canvas'],
          'vendor-feedback': ['react-hot-toast', 'sonner'],
          'vendor-utils': ['class-variance-authority', 'clsx', 'next-themes', 'tailwind-merge'],
        },
      },
    },
  },
})
