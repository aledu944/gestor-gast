import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { BellRing, Globe2, Palette, ShieldAlert } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { PwaManager } from '#/components/pwa-manager'
import { ThemeControl } from '#/components/theme-control'
import { updateSettings } from '#/features/expenses/expenses.functions'
import { bootstrapQueryOptions, invalidateExpenseQueries } from '#/features/expenses/queries'
import { useOnline } from '#/hooks/use-online'

export const Route = createFileRoute('/ajustes')({
  loader: ({ context }) => context.queryClient.fetchQuery(bootstrapQueryOptions()),
  component: SettingsPage,
})

function SettingsPage() {
  const { settings } = Route.useLoaderData()
  const router = useRouter()
  const queryClient = useQueryClient()
  const online = useOnline()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!online) return
    const form = new FormData(event.currentTarget)
    setSaving(true)
    setSaved(false)
    setError('')
    try {
      await updateSettings({ data: {
        defaultCurrency: String(form.get('currency')),
        timeZone: String(form.get('timeZone')),
        dueReminderDays: Number(form.get('dueReminderDays')),
        reminderHour: Number(form.get('reminderHour')),
        monthlyDigestEnabled: form.get('monthlyDigestEnabled') === 'on',
      } })
      await invalidateExpenseQueries(queryClient)
      await router.invalidate({ sync: true })
      setSaved(true)
    } catch {
      setError('No se pudieron guardar las preferencias.')
    } finally {
      setSaving(false)
    }
  }

  return <div className="page settings-page">
    <section className="page-heading"><div><span className="eyebrow">Preferencias</span><h1>Ajustes</h1><p>Configura cómo se ve, se instala y te recuerda la aplicación.</p></div></section>
    <div className="settings-grid">
      <section className="panel settings-panel"><header className="settings-section-title"><Palette size={20} /><div><h2>Apariencia</h2><p>El tema se guarda solo en este dispositivo.</p></div></header><ThemeControl /></section>
      <section className="panel settings-panel wide-setting"><header className="settings-section-title"><BellRing size={20} /><div><h2>Aplicación y avisos</h2><p>Instala la PWA y elige si este dispositivo recibe recordatorios.</p></div></header><PwaManager /></section>
      <section className="panel settings-panel"><header className="settings-section-title"><Globe2 size={20} /><div><h2>Formato y horario</h2><p>Los registros antiguos conservan su moneda.</p></div></header><form className="settings-form" onSubmit={submit}>
        <label><span>Moneda predeterminada</span><select name="currency" defaultValue={settings.defaultCurrency}><option value="BOB">BOB · Boliviano</option><option value="USD">USD · Dólar</option><option value="EUR">EUR · Euro</option></select></label>
        <label><span>Zona horaria</span><select name="timeZone" defaultValue={settings.timeZone}><option value="America/La_Paz">America/La_Paz</option><option value="America/Lima">America/Lima</option><option value="America/Bogota">America/Bogota</option><option value="America/Mexico_City">America/Mexico_City</option></select></label>
        <div className="form-grid"><label><span>Días de anticipación</span><input name="dueReminderDays" type="number" min="1" max="30" defaultValue={settings.dueReminderDays} /></label><label><span>Hora local</span><input name="reminderHour" type="number" min="0" max="23" defaultValue={settings.reminderHour} /></label></div>
        <label className="check-setting"><input type="checkbox" name="monthlyDigestEnabled" defaultChecked={settings.monthlyDigestEnabled} /><span>Enviar resumen al comenzar el mes</span></label>
        <button className="button primary" disabled={saving || !online}>{saving ? 'Guardando…' : 'Guardar preferencias'}</button>{!online && <span className="form-error">Disponible cuando recuperes la conexión.</span>}{error && <span className="form-error">{error}</span>}{saved && <span className="saved-note">Cambios guardados</span>}
      </form></section>
      <section className="panel settings-panel warning-panel"><header className="settings-section-title"><ShieldAlert size={20} /><div><h2>Acceso público</h2><p>Esta versión no tiene inicio de sesión. Cualquier persona con la URL puede ver, editar o eliminar todos los gastos.</p></div></header></section>
    </div>
  </div>
}
