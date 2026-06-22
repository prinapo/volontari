/* eslint-env node */

module.exports = function (ctx) {
  return {
    boot: ['axios', 'auth'],
    css: ['app.scss'],
    extras: ['material-icons', 'mdi-v7'],
    build: {
      distDir: 'dist/spa',
      vueRouterMode: 'history',
      env: {
        VITE_API_URL: ctx.dev
          ? 'http://localhost:9000'
          : 'https://app.sostienilsostegno.com',
        VITE_RESET_URL: ctx.dev
          ? 'http://localhost:9000/reset-password?token='
          : 'https://volontari.sostienilsostegno.com/reset-password?token=',
        VITE_INVII_PUBBLICI_FOLDER: '25cd095a-20a2-48fd-9827-9b6754b429f6'
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
          primary: '#2E5D6E',
          secondary: '#6B6B7B',
          accent: '#D4956A',
          positive: '#4A7C59',
          negative: '#C0503A',
          warning: '#E8B86D',
          info: '#2E5D6E'
        }
      }
    },
    animations: 'all',
    sourceFiles: {
      rootComponent: 'src/App.vue',
      router: 'src/router/index',
      store: 'src/stores/index'
    }
  }
}
