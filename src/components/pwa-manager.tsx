import { Bell, BellOff, Check, Download, RefreshCw, Share2, Smartphone } from 'lucide-react'
import { useEffect, useState } from 'react'

import {
  disablePushSubscription,
  getVapidPublicKey,
  savePushSubscription,
} from '#/features/expenses/expenses.functions'
import { useOnline } from '#/hooks/use-online'
import { usePwaRegistration } from './pwa-registration'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

function decodeVapidKey(value: string) {
  const padding = '='.repeat((4 - (value.length % 4)) % 4)
  const base64 = (value + padding).replace(/-/g, '+').replace(/_/g, '/')
  return Uint8Array.from(atob(base64), (character) => character.charCodeAt(0))
}

export function PwaManager() {
  const online = useOnline()
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [showIosInstructions, setShowIosInstructions] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)
  const [pushSupported, setPushSupported] = useState(false)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = usePwaRegistration()

  useEffect(() => {
    const media = window.matchMedia('(display-mode: standalone)')
    const iosCapability = 'standalone' in navigator
    const updateInstalled = () => {
      const isInstalled = media.matches || Boolean((navigator as Navigator & { standalone?: boolean }).standalone)
      setInstalled(isInstalled)
      setShowIosInstructions(iosCapability && !isInstalled)
      setPushSupported(
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window &&
        (!iosCapability || isInstalled),
      )
    }
    const onPrompt = (event: Event) => {
      event.preventDefault()
      setInstallPrompt(event as InstallPromptEvent)
    }
    updateInstalled()
    media.addEventListener('change', updateInstalled)
    window.addEventListener('beforeinstallprompt', onPrompt)
    void navigator.serviceWorker?.ready.then(async (registration) => {
      setPushEnabled(Boolean(await registration.pushManager.getSubscription()))
    })
    return () => {
      media.removeEventListener('change', updateInstalled)
      window.removeEventListener('beforeinstallprompt', onPrompt)
    }
  }, [])

  const install = async () => {
    if (!installPrompt) return
    await installPrompt.prompt()
    const choice = await installPrompt.userChoice
    setMessage(choice.outcome === 'accepted' ? 'Gestor Gast se está instalando.' : 'Puedes instalarla cuando quieras.')
    setInstallPrompt(null)
  }

  const togglePush = async () => {
    if (!pushSupported) {
      setMessage('Este navegador o modo de instalación no admite avisos Web Push.')
      return
    }
    setBusy(true)
    setMessage('')
    try {
      const registration = await navigator.serviceWorker.ready
      const current = await registration.pushManager.getSubscription()
      if (current) {
        await disablePushSubscription({ data: { endpoint: current.endpoint } })
        await current.unsubscribe()
        setPushEnabled(false)
        setMessage('Avisos del dispositivo desactivados.')
        return
      }

      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        setMessage('El navegador no concedió permiso para avisos.')
        return
      }
      const { publicKey } = await getVapidPublicKey()
      if (!publicKey) {
        setMessage('Configura las claves VAPID en el servidor para activar avisos.')
        return
      }
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeVapidKey(publicKey),
      })
      const json = subscription.toJSON()
      if (!json.endpoint || !json.keys?.p256dh || !json.keys.auth) {
        throw new Error('Suscripción incompleta')
      }
      await savePushSubscription({
        data: {
          endpoint: json.endpoint,
          keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
          userAgent: navigator.userAgent,
        },
      })
      setPushEnabled(true)
      setMessage('Avisos activados en este dispositivo.')
    } catch {
      setMessage('No se pudieron configurar los avisos en este dispositivo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="settings-stack">
      <div className="setting-row">
        <span className="setting-icon"><Smartphone size={19} /></span>
        <div><strong>{installed ? 'Aplicación instalada' : 'Instalar Gestor Gast'}</strong><p>{installed ? 'Se abre como una app independiente.' : installPrompt ? 'Lista para añadir a tu dispositivo.' : showIosInstructions ? 'Usa Compartir y luego Añadir a inicio.' : 'La opción aparecerá cuando el navegador permita instalarla.'}</p></div>
        {installed ? <span className="success-mark"><Check size={16} />Instalada</span> : installPrompt ? <button className="button secondary" onClick={install}><Download size={16} />Instalar</button> : showIosInstructions ? <span className="ios-hint"><Share2 size={16} />Compartir</span> : null}
      </div>
      <div className="setting-row">
        <span className="setting-icon">{pushEnabled ? <Bell size={19} /> : <BellOff size={19} />}</span>
        <div><strong>Avisos de vencimiento</strong><p>Resumen el día 1 y recordatorio tres días antes.</p></div>
        <button className="button secondary" onClick={togglePush} disabled={busy || !pushSupported || !online}>{pushEnabled ? 'Desactivar' : 'Activar'}</button>
      </div>
      {needRefresh && <div className="update-banner"><span>Nueva versión disponible.</span><button onClick={() => updateServiceWorker(true)}><RefreshCw size={15} />Actualizar</button><button className="icon-button" onClick={() => setNeedRefresh(false)} aria-label="Cerrar">&times;</button></div>}
      {message && <p className="setting-message" role="status">{message}</p>}
    </div>
  )
}
