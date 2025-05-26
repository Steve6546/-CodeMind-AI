import { defineConfig } from 'vite'

export default defineConfig({
  root: 'public',
  server: {
    host: '0.0.0.0',
    port: 3000,
    cors: true,
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: 'public/index.html'
      }
    }
  },
  resolve: {
    alias: {
      '@': '/src',
      '@components': '/src/ui/components',
      '@utils': '/src/utils',
      '@core': '/src/core'
    }
  },
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version)
  }
})
