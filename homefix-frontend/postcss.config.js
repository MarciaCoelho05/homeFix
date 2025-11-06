export default {
  plugins: {
    autoprefixer: {
      add: true,
      remove: true,
      flexbox: true,
      grid: true,
      overrideBrowserslist: [
        '> 1%',
        'last 2 versions',
        'not dead'
      ]
    }
  }
}

