import { createFileRoute, useRouter } from '@tanstack/react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Pencil, Plus, Trash2, X } from 'lucide-react'
import { useState } from 'react'
import type { FormEvent } from 'react'

import { CategoryIcon } from '#/components/category-icon'
import { deleteCategory, saveCategory } from '#/features/expenses/expenses.functions'
import { bootstrapQueryOptions, invalidateExpenseQueries } from '#/features/expenses/queries'
import type { CategoryDto } from '#/features/expenses/types'
import { useOnline } from '#/hooks/use-online'

const iconOptions = ['House', 'Zap', 'ShoppingBasket', 'Bus', 'HeartPulse', 'RefreshCw', 'GraduationCap', 'Gamepad2', 'Gift', 'Shapes'] as const
const colors = ['#5B5BD6', '#F2A65A', '#2DBA9A', '#5B8DEF', '#E56872', '#9467D8'] as const

export const Route = createFileRoute('/categorias')({
  loader: ({ context }) => context.queryClient.fetchQuery(bootstrapQueryOptions()),
  component: CategoriesPage,
})

function CategoriesPage() {
  const { categories } = Route.useLoaderData()
  const router = useRouter()
  const queryClient = useQueryClient()
  const online = useOnline()
  const [editing, setEditing] = useState<CategoryDto | 'new' | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!online) return
    const form = new FormData(event.currentTarget)
    setSaving(true)
    setError('')
    try {
      await saveCategory({ data: {
        id: editing && editing !== 'new' ? editing.id : undefined,
        name: String(form.get('name')),
        icon: String(form.get('icon')) as (typeof iconOptions)[number],
        color: String(form.get('color')) as (typeof colors)[number],
      } })
      await invalidateExpenseQueries(queryClient)
      await router.invalidate({ sync: true })
      setEditing(null)
    } catch {
      setError('Ese nombre ya está en uso o no se pudo guardar.')
    } finally { setSaving(false) }
  }

  const remove = async (category: CategoryDto) => {
    if (!online) return
    if (!window.confirm(`Eliminar ${category.name}? Los gastos quedarán sin categoría.`)) return
    await deleteCategory({ data: { id: category.id } })
    await invalidateExpenseQueries(queryClient)
    await router.invalidate({ sync: true })
  }

  return <div className="page categories-page">
    <section className="page-heading split-heading"><div><span className="eyebrow">Organización</span><h1>Tus categorías</h1><p>Una lectura visual de dónde se concentra cada boliviano.</p></div><button className="button primary" onClick={() => setEditing('new')} disabled={!online}><Plus size={17} />Nueva categoría</button></section>
    <div className="category-card-grid">{categories.map((category) => <article className="category-card" key={category.id}>
      <span className="category-card-icon" style={{ background: `${category.color}18`, color: category.color }}><CategoryIcon name={category.icon} size={21} /></span>
      <div><strong>{category.name}</strong><small>{category.icon}</small></div>
      <div className="category-card-actions"><button className="icon-button subtle" onClick={() => setEditing(category)} aria-label={`Editar ${category.name}`} disabled={!online}><Pencil size={16} /></button><button className="icon-button subtle danger-text" onClick={() => remove(category)} aria-label={`Eliminar ${category.name}`} disabled={!online}><Trash2 size={16} /></button></div>
    </article>)}</div>
    {editing && <div className="dialog-layer"><section className="expense-dialog small-dialog" role="dialog" aria-modal="true" aria-labelledby="category-title"><header className="dialog-header"><div><span className="eyebrow">Clasificación</span><h2 id="category-title">{editing === 'new' ? 'Nueva categoría' : 'Editar categoría'}</h2></div><button className="icon-button" onClick={() => setEditing(null)} aria-label="Cerrar"><X size={19} /></button></header><form className="expense-form" onSubmit={submit}>
      <label><span>Nombre</span><input autoFocus name="name" minLength={2} maxLength={32} required defaultValue={editing === 'new' ? '' : editing.name} /></label>
      <label><span>Icono</span><div className="icon-picker">{iconOptions.map((icon) => <label key={icon}><input type="radio" name="icon" value={icon} aria-label={icon} defaultChecked={icon === (editing === 'new' ? 'Shapes' : editing.icon)} /><span><CategoryIcon name={icon} /></span></label>)}</div></label>
      <label><span>Color</span><div className="color-picker">{colors.map((color) => <label key={color}><input type="radio" name="color" value={color} aria-label={`Color ${color}`} defaultChecked={color === (editing === 'new' ? '#5B5BD6' : editing.color)} /><span style={{ background: color }} /></label>)}</div></label>
      {!online && <p className="form-error">Vuelve a conectarte para guardar cambios.</p>}{error && <p className="form-error">{error}</p>}<div className="dialog-actions"><button type="button" className="button ghost" onClick={() => setEditing(null)}>Cancelar</button><button className="button primary" disabled={saving || !online}>Guardar categoría</button></div>
    </form></section></div>}
  </div>
}
