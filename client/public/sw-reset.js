(function () {
  var SW_VER = 'v3'
  var key = 'sw_reset_' + SW_VER

  if (!('serviceWorker' in navigator) || sessionStorage.getItem(key)) return

  var cachePatterns = [
    /^google-fonts$/,
    /^qr-codes$/,
    /^api-products$/,
    /^workbox-/,
    /^precache-/,
    /^next-pwa-/,
  ]

  caches.keys().then(function (names) {
    names.forEach(function (name) {
      if (cachePatterns.some(function (pattern) { return pattern.test(name) })) {
        caches.delete(name)
      }
    })
  })

  navigator.serviceWorker.getRegistrations().then(function (registrations) {
    registrations.forEach(function (registration) {
      if (registration.scope.indexOf(window.location.origin) === 0) {
        registration.unregister()
      }
    })
  })

  sessionStorage.setItem(key, '1')
  if (navigator.serviceWorker.controller) {
    location.reload()
  }
})()
