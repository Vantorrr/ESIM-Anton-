window.addEventListener('beforeinstallprompt', function (event) {
  event.preventDefault()
  window.pwaDeferredPrompt = event
})
