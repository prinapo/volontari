import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { visualizer } from 'rollup-plugin-visualizer'

const __dirname = dirname(fileURLToPath(import.meta.url))

export default function (ctx) {
  return {
    boot: ['axios', 'auth'],
    css: ['app.scss'],
    extras: ['material-icons'],
    build: {
      distDir: 'dist/spa',
      vueRouterMode: 'history',
      extendViteConf(viteConf) {
        viteConf.resolve = viteConf.resolve || {}
        viteConf.resolve.alias = {
          ...viteConf.resolve.alias,
          src: resolve(__dirname, 'src'),
          stores: resolve(__dirname, 'src/stores'),
          components: resolve(__dirname, 'src/components'),
          pages: resolve(__dirname, 'src/pages'),
          boot: resolve(__dirname, 'src/boot'),
          utils: resolve(__dirname, 'src/utils'),
          services: resolve(__dirname, 'src/services'),
          layouts: resolve(__dirname, 'src/layouts'),
          router: resolve(__dirname, 'src/router'),
          assets: resolve(__dirname, 'src/assets')
        }
      },
      vitePlugins: [
        [ 'rollup-plugin-visualizer', {
          filename: 'dist/bundle-report.html',
          template: 'treemap',
          gzipSize: true,
          brotliSize: true,
          open: false
        } ]
      ],
      defineEnv: {
        VITE_API_URL: ctx.dev
          ? 'https://development.sostienilsostegno.com'
          : 'https://app.sostienilsostegno.com',
        VITE_APP_TITLE: ctx.dev
          ? 'Portale Volontario - Development'
          : 'Portale Volontario'
      },
      env: {
        VITE_RESET_URL: ctx.dev
          ? 'http://localhost:9000/reset-password?token='
          : 'https://volontari.sostienilsostegno.com/reset-password?token=',
        VITE_INVII_PUBBLICI_FOLDER: '25cd095a-20a2-48fd-9827-9b6754b429f6',
        VITE_LISTE_PAGAMENTI_FOLDER: ctx.dev
          ? 'c3e98185-5fcf-466a-9263-aa5515ed65c1'
          : 'feb802e4-4a55-45d0-aaeb-b24803eca3ed',
        VITE_GIUSTIFICATIVI_FOLDER: '91a9c958-206f-4e1c-8143-e67f85398d0c'
      }
    },
    devServer: {
      port: 9000,
      open: false
    },
      framework: {
      iconSet: 'material-icons',
      lang: 'it',
      all: 'auto',
      plugins: ['Notify', 'Dialog'],
      config: {
        brand: {
          primary: ctx.dev ? '#C0503A' : '#2E5D6E',
          secondary: '#6B6B7B',
          accent: '#D4956A',
          positive: '#4A7C59',
          negative: '#C0503A',
          warning: '#E8B86D',
          info: '#2E5D6E'
        }
      }
    },
    animations: [],
    sourceFiles: {
      rootComponent: 'src/App.vue',
      router: 'src/router/index',
      store: 'src/stores/index'
    }
  }
}
