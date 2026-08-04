import { createClientOnlyFn } from '@tanstack/react-start'
import { get, set } from 'idb-keyval'
import type { DashboardSnapshot } from '#/features/expenses/types'

const key = (month: string) => `gestor-gast:dashboard:${month}`

export const cacheDashboard = createClientOnlyFn((snapshot: DashboardSnapshot) =>
  set(key(snapshot.month), snapshot),
)

export const readCachedDashboard = createClientOnlyFn((month: string) =>
  get<DashboardSnapshot>(key(month)),
)
