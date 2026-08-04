import {
  Bus,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  RefreshCw,
  Shapes,
  ShoppingBasket,
  Zap,
} from 'lucide-react'

const icons = {
  Bus,
  Gamepad2,
  Gift,
  GraduationCap,
  HeartPulse,
  House,
  RefreshCw,
  Shapes,
  ShoppingBasket,
  Zap,
}

export function CategoryIcon({ name, size = 18 }: { name?: string; size?: number }) {
  const Icon = name && name in icons ? icons[name as keyof typeof icons] : Shapes
  return <Icon aria-hidden="true" size={size} strokeWidth={1.8} />
}
