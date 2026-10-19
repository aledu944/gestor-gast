import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

test('dashboard renders its core financial hierarchy', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hola, este es tu pulso.' })).toBeVisible()
  await expect(page.getByText('Comprometido')).toBeVisible()
  await expect(page.getByRole('button', { name: /Añadir pendiente/ })).toBeVisible()
})

test('expense dialog validates and can be dismissed', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Añadir pendiente/ }).click()
  await expect(page.getByRole('dialog', { name: 'Añadir pendiente' })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
})

test('dashboard has no automatically detectable serious accessibility violations', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hola, este es tu pulso.' })).toBeVisible()
  const results = await new AxeBuilder({ page }).analyze()
  expect(results.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact ?? ''))).toEqual([])
})

test('quick actions from the PWA manifest open the intended flow', async ({ page }) => {
  await page.goto('/?action=paid')
  await expect(page.getByRole('dialog', { name: 'Registrar pago' })).toBeVisible()
  await page.getByRole('button', { name: 'Cerrar' }).click()
})

test('the app is always dark and exposes no theme switch', async ({ page }) => {
  await page.goto('/ajustes')
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.getByRole('button', { name: 'Oscuro' })).toHaveCount(0)
})

test('sheets scroll internally and keep their actions reachable on small screens', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 520 })
  await page.goto('/')
  await page.getByRole('button', { name: /Añadir pendiente/ }).click()
  const dialog = page.getByRole('dialog', { name: 'Añadir pendiente' })
  await expect(dialog).toBeVisible()
  await expect(page.locator('html')).toHaveClass(/sheet-open/)
  const submit = dialog.getByRole('button', { name: 'Añadir gasto' })
  await expect(submit).toBeInViewport()
  const box = await dialog.boundingBox()
  expect(box!.y + box!.height).toBeLessThanOrEqual(520)
  await page.getByRole('button', { name: 'Cerrar' }).click()
  await expect(page.locator('html')).not.toHaveClass(/sheet-open/)
})

test('navigation adapts to the current viewport', async ({ page }, testInfo) => {
  await page.goto('/')
  const mobile = testInfo.project.name === 'mobile-chrome'
  if (mobile) {
    await expect(page.locator('.mobile-nav')).toBeVisible()
    await expect(page.locator('.desktop-sidebar')).toBeHidden()
  } else {
    await expect(page.locator('.mobile-nav')).toBeHidden()
    await expect(page.locator('.desktop-sidebar')).toBeVisible()
  }
})

test('the last dashboard snapshot remains consultable offline', async ({ page, context }) => {
  test.setTimeout(45_000)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Hola, este es tu pulso.' })).toBeVisible()
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready
  })
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))
  await expect(page.getByRole('heading', { name: 'Hola, este es tu pulso.' })).toBeVisible()

  await context.setOffline(true)
  try {
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('heading', { name: 'Hola, este es tu pulso.' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Modo sin conexión · última sincronización/)).toBeVisible()
    await expect(page.getByRole('button', { name: /Añadir pendiente/ })).toBeDisabled()
  } finally {
    await context.setOffline(false)
  }
})

test('an expense completes the create, pay, edit and delete cycle', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  const originalName = `Prueba E2E ${testInfo.project.name} ${Date.now()}`
  const editedName = `${originalName} editada`

  await page.goto('/gastos')
  await page.getByRole('button', { name: 'Nuevo movimiento' }).first().click()
  await page.getByRole('button', { name: /Añadir pendiente/ }).click()
  const createDialog = page.getByRole('dialog', { name: 'Añadir pendiente' })
  await createDialog.getByLabel('Nombre').fill(originalName)
  await createDialog.getByRole('textbox', { name: /Monto/ }).fill('12,50')
  await createDialog.getByRole('button', { name: 'Añadir gasto' }).click()

  let row = page.getByRole('article').filter({ hasText: originalName })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: `Acciones para ${originalName}` }).click()
  await page.getByRole('button', { name: 'Marcar pagado' }).click()
  row = page.getByRole('article').filter({ hasText: originalName })
  await expect(row.getByText('Pagado', { exact: true })).toBeVisible()

  await row.getByRole('button', { name: `Acciones para ${originalName}` }).click()
  await page.getByRole('button', { name: 'Editar' }).click()
  const editDialog = page.getByRole('dialog', { name: 'Editar gasto' })
  await editDialog.getByLabel('Nombre').fill(editedName)
  await editDialog.getByRole('button', { name: 'Guardar cambios' }).click()
  row = page.getByRole('article').filter({ hasText: editedName })
  await expect(row).toBeVisible()

  await row.getByRole('button', { name: `Acciones para ${editedName}` }).click()
  await page.getByRole('button', { name: 'Eliminar' }).click()
  await page.getByRole('dialog', { name: '¿Eliminar este gasto?' }).getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByText(editedName, { exact: true })).toHaveCount(0)
})
