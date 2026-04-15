'use client'

import { useLayoutEffect } from 'react'
import { applyHexTheme } from '@/lib/theme'

export function ThemeApplier() {
  useLayoutEffect(() => {
    const stored = localStorage.getItem('cor_sistema')
    if (stored) applyHexTheme(stored)

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'cor_sistema' && e.newValue) applyHexTheme(e.newValue)
    }

    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return null
}