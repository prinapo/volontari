import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath } from 'url'
import path from 'path'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const srcRoot = path.resolve(dirname, '../../src')

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      src: srcRoot,
      app: srcRoot,
      components: path.resolve(srcRoot, 'components'),
      pages: path.resolve(srcRoot, 'pages'),
      layouts: path.resolve(srcRoot, 'layouts'),
      assets: path.resolve(srcRoot, 'assets'),
      boot: path.resolve(srcRoot, 'boot'),
      stores: path.resolve(srcRoot, 'stores'),
      router: path.resolve(srcRoot, 'router')
    }
  },
  define: {
    'import.meta.env.VITE_API_URL': JSON.stringify('http://localhost:9000'),
    'import.meta.env.VITE_APP_TITLE': JSON.stringify('Volontari Test'),
    'import.meta.env.VITE_VERIFICA_ROLE_IDS': JSON.stringify(''),
    'import.meta.env.VITE_GESTIONE_ROLE_IDS': JSON.stringify(''),
    'import.meta.env.VITE_ADMIN_ROLE_IDS': JSON.stringify(''),
    'import.meta.env.VITE_RESET_URL': JSON.stringify('http://localhost:9000/reset-password?token='),
    'import.meta.env.VITE_INVII_PUBBLICI_FOLDER': JSON.stringify('test-folder-id')
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/unit/setup.js'],
    include: ['tests/unit/**/*.test.js'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'html'],
      include: ['src/**/*.{js,vue}'],
      exclude: [
        'src/main.js',
        'src/App.vue',
        'src/router/**',
        'src/boot/**',
        'src-pwa/**',
        'src/index.template.html'
      ],
      thresholds: {
        perFile: true,
        statements: 0,
        branches: 0,
        functions: 0,
        lines: 0
      },
      excludeNodeModules: true
    }
  }
})
