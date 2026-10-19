import { createContext, useContext } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import type { ReactNode } from 'react'

type PwaRegistrationValue = ReturnType<typeof useRegisterSW>

const PwaRegistrationContext = createContext<PwaRegistrationValue | null>(null)

export function PwaRegistrationProvider({ children }: { children: ReactNode }) {
  const registration = useRegisterSW({ immediate: true })
  return (
    <PwaRegistrationContext.Provider value={registration}>
      {children}
    </PwaRegistrationContext.Provider>
  )
}

export function usePwaRegistration() {
  const registration = useContext(PwaRegistrationContext)
  if (!registration) throw new Error('PwaRegistrationProvider is missing')
  return registration
}
