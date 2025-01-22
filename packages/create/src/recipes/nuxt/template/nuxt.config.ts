export default defineNuxtConfig({
  modules: [
    'nuxt-edgedb-module',
    '@nuxt/ui',
  ],
  edgeDb: {
    auth: true,
    oauth: true,
  },
  devtools: {
    enabled: true
  },
  tailwindcss: {
    viewer: false,
  },
})
