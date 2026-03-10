import { api } from './api'

async function getVapidPublicKey(): Promise<string> {
  const { data } = await api.get('/users/push/vapid-public-key')
  return data.publicKey
}

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const arr = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) arr[i] = rawData.charCodeAt(i)
  return arr.buffer
}

export async function subscribeToPush(userId: string): Promise<boolean> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.warn('Push not supported')
    return false
  }

  try {
    const reg = await navigator.serviceWorker.ready
    const vapidKey = await getVapidPublicKey()
    if (!vapidKey) return false

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    const { endpoint, keys } = sub.toJSON() as any
    await api.post(`/users/${userId}/push/subscribe`, {
      endpoint,
      p256dh: keys.p256dh,
      auth: keys.auth,
    })

    return true
  } catch (e) {
    console.error('Push subscribe error:', e)
    return false
  }
}

export async function requestPushPermission(userId: string): Promise<boolean> {
  if (!('Notification' in window)) return false

  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  return subscribeToPush(userId)
}
