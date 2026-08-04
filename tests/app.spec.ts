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

test('theme choice persists on the device', async ({ page }) => {
  await page.goto('/ajustes')
  await page.getByRole('button', { name: 'Oscuro' }).click()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await page.getByRole('button', { name: 'Sistema' }).click()
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

test('an expense completes the create, pay, edit and delete cycle', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  const originalName = `Prueba E2E ${testInfo.project.name} ${Date.now()}`
  const editedName = `${originalName} editada`

  await page.goto('/gastos')
  await page.getByRole('button', { name: 'Añadir pendiente' }).click()
  const createDialog = page.getByRole('dialog', { name: 'Añadir pendiente' })
  await createDialog.getByLabel('Nombre').fill(originalName)
  await createDialog.getByRole('textbox', { name: /Monto/ }).fill('12,50')
  await page.getByRole('button', { name: 'Añadir gasto' }).click()

  let row = page.getByRole('article').filter({ hasText: originalName })
  await expect(row).toBeVisible()
  await row.getByRole('button', { name: `Acciones para ${originalName}` }).click()
  await page.getByRole('button', { name: 'Marcar pagado' }).click()
  row = page.getByRole('article').filter({ hasText: originalName })
  await expect(row.getByText('Pagado', { exact: true })).toBeVisible()

  await row.getByRole('button', { name: `Acciones para ${originalName}` }).click()
  await page.getByRole('button', { name: 'Editar' }).click()
  await page.getByLabel('Nombre').fill(editedName)
  await page.getByRole('button', { name: 'Guardar cambios' }).click()
  row = page.getByRole('article').filter({ hasText: editedName })
  await expect(row).toBeVisible()

  await row.getByRole('button', { name: `Acciones para ${editedName}` }).click()
  page.once('dialog', (dialog) => dialog.accept())
  await page.getByRole('button', { name: 'Eliminar' }).click()
  await expect(page.getByText(editedName, { exact: true })).toHaveCount(0)
})
