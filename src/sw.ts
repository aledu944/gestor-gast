/// <reference lib="webworker" />

import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute, setCatchHandler } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{ url: string; revision?: string }>
}

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

registerRoute(
  new NavigationRoute(
    new NetworkFirst({
      cacheName: 'gestor-gast-pages-v1',
      networkTimeoutSeconds: 4,
    }),
  ),
)

setCatchHandler(async ({ request }) => {
  if (request.destination === 'document') {
    return (await caches.match('/offline.html')) ?? Response.error()
  }
  return Response.error()
})

self.addEventListener('push', (event) => {
  const fallback = {
    title: 'Gestor Gast',
    body: 'Tienes pagos por revisar.',
    url: '/',
    tag: 'gestor-gast-reminder',
  }
  const payload = event.data ? event.data.json() : fallback
  event.waitUntil(
    self.registration.showNotification(payload.title ?? fallback.title, {
      body: payload.body ?? fallback.body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: payload.tag ?? fallback.tag,
      data: { url: payload.url ?? '/' },
    }),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = String(event.notification.data?.url ?? '/')
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clients) => {
      const existing = clients.find((client) => 'focus' in client)
      if (existing && 'navigate' in existing) {
        await existing.navigate(url)
        return existing.focus()
      }
      return self.clients.openWindow(url)
    }),
  )
})

export {}
