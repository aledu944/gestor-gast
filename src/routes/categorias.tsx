import { useSuspenseQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Check, Loader2, Pencil, Plus, Trash2 } from 'lucide-react'
import { useId, useState } from 'react'
import type { FormEvent } from 'react'

import { CategoryIcon } from '#/components/category-icon'
import { ConfirmSheet, Sheet } from '#/components/sheet'
import { useDeleteCategory, useSaveCategory } from '#/features/expenses/mutations'
import { bootstrapQueryOptions } from '#/features/expenses/queries'
import type { CategoryDto } from '#/features/expenses/types'
import { useOnline } from '#/hooks/use-online'

const iconOptions = ['House', 'Zap', 'ShoppingBasket', 'Bus', 'HeartPulse', 'RefreshCw', 'GraduationCap', 'Gamepad2', 'Gift', 'Shapes'] as const
const colors = ['#5B5BD6', '#F2A65A', '#2DBA9A', '#5B8DEF', '#E56872', '#9467D8'] as const

export const Route = createFileRoute('/categorias')({
  loader: ({ context }) => context.queryClient.ensureQueryData(bootstrapQueryOptions()),
  component: CategoriesPage,
})

function CategoriesPage() {
  const { data: { categories } } = useSuspenseQuery(bootstrapQueryOptions())
  const online = useOnline()
  const [editing, setEditing] = useState<CategoryDto | 'new' | null>(null)
  const [deleting, setDeleting] = useState<CategoryDto | null>(null)

  return <div className="page categories-page">
    <section className="page-heading split-heading"><div><span className="eyebrow">Organización</span><h1>Tus categorías</h1></div><button type="button" className="button primary" onClick={() => setEditing('new')} disabled={!online}><Plus size={17} />Nueva categoría</button></section>
    <div className="category-card-grid">{categories.map((category) => <article className="category-card" key={category.id}>
      <span className="category-card-icon" style={{ background: `${category.color}22`, color: category.color }}><CategoryIcon name={category.icon} size={21} /></span>
      <strong>{category.name}</strong>
      <div className="category-card-actions"><button type="button" className="icon-button subtle" onClick={() => setEditing(category)} aria-label={`Editar ${category.name}`} disabled={!online}><Pencil size={16} /></button><button type="button" className="icon-button subtle danger-text" onClick={() => setDeleting(category)} aria-label={`Eliminar ${category.name}`} disabled={!online}><Trash2 size={16} /></button></div>
    </article>)}</div>
    {editing && <CategorySheet category={editing === 'new' ? null : editing} onClose={() => setEditing(null)} />}
    {deleting && <DeleteCategorySheet category={deleting} onClose={() => setDeleting(null)} />}
  </div>
}

function CategorySheet({ category, onClose }: { category: CategoryDto | null; onClose: () => void }) {
  const formId = useId()
  const online = useOnline()
  const save = useSaveCategory()
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!online) return
    const form = new FormData(event.currentTarget)
    setError('')
    try {
      await save.mutateAsync({
        id: category?.id,
        name: String(form.get('name')),
        icon: String(form.get('icon')) as (typeof iconOptions)[number],
        color: String(form.get('color')) as (typeof colors)[number],
      })
      onClose()
    } catch {
      setError('Ese nombre ya está en uso o no se pudo guardar.')
    }
  }

  return <Sheet title={category ? 'Editar categoría' : 'Nueva categoría'} eyebrow="Clasificación" size="sm" onClose={onClose} footer={<>
    {!online && <p className="form-error">Vuelve a conectarte para guardar cambios.</p>}
    {error && <p className="form-error" role="alert">{error}</p>}
    <div className="sheet-actions"><button type="button" className="button ghost" onClick={onClose}>Cancelar</button><button className="button primary grow" form={formId} disabled={save.isPending || !online}>{save.isPending ? <Loader2 className="spin" size={17} /> : <Check size={17} />}Guardar categoría</button></div>
  </>}>
    <form id={formId} className="sheet-form" onSubmit={submit}>
      <label><span>Nombre</span><input autoFocus name="name" minLength={2} maxLength={32} required autoComplete="off" defaultValue={category?.name ?? ''} /></label>
      <fieldset className="chip-field"><legend>Icono</legend><div className="icon-picker">{iconOptions.map((icon) => <label key={icon}><input type="radio" name="icon" value={icon} aria-label={icon} defaultChecked={icon === (category?.icon ?? 'Shapes')} /><span><CategoryIcon name={icon} /></span></label>)}</div></fieldset>
      <fieldset className="chip-field"><legend>Color</legend><div className="color-picker">{colors.map((color) => <label key={color}><input type="radio" name="color" value={color} aria-label={`Color ${color}`} defaultChecked={color === (category?.color ?? '#F2A65A')} /><span style={{ background: color }} /></label>)}</div></fieldset>
    </form>
  </Sheet>
}

function DeleteCategorySheet({ category, onClose }: { category: CategoryDto; onClose: () => void }) {
  const remove = useDeleteCategory()
  return <ConfirmSheet
    title={`¿Eliminar ${category.name}?`}
    message="Los gastos de esta categoría quedarán sin categoría."
    busy={remove.isPending}
    onClose={onClose}
    options={[{ label: 'Eliminar categoría', tone: 'danger', onSelect: async () => { try { await remove.mutateAsync({ id: category.id }) } finally { onClose() } } }]}
  />
}
