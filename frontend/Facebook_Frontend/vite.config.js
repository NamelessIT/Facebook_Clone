import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The lockfile is kept current; avoid stale-age warnings when the local clock
// is newer than the latest caniuse-lite publication.
process.env.BROWSERSLIST_IGNORE_OLD_DATA ??= 'true'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    exclude: ['node_modules/**', 'dist/**', 'tests/e2e/**', '**/*.e2e.*'],
  },
})
