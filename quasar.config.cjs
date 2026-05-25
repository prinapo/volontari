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
        API_URL: ctx.dev
          ? 'http://localhost:9000/api'
          : 'https://app.sostienilsostegno.com'
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
      plugins: ['Notify', 'Dialog']
    },
    animations: 'all',
    sourceFiles: {
      rootComponent: 'src/App.vue',
      router: 'src/router/index',
      store: 'src/stores/index'
    }
  }
}
