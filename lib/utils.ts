import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Date helpers — work with date-only strings (YYYY-MM-DD) using local timezone
export function toLocalDateInput(date: Date = new Date()): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function parseDateFromYYYYMMDD(value?: string | null): Date | null {
  if (!value) return null
  const parts = value.split('-')
  if (parts.length < 3) return null
  const [y, m, d] = parts.map((p) => Number(p))
  if (!y || !m || !d) return null
  return new Date(y, m - 1, d)
}

export function formatDateBRFromYYYYMMDD(value?: string | Date | null, options?: Intl.DateTimeFormatOptions): string {
  if (!value) return '-'
  let date: Date | null = null
  if (typeof value === 'string') date = parseDateFromYYYYMMDD(value)
  else if (value instanceof Date) date = value
  if (!date) return '-'
  return date.toLocaleDateString('pt-BR', options || { day: '2-digit', month: '2-digit', year: 'numeric' })
}

export function startOfDay(date = new Date()): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}
