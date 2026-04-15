"use client"

import { ThemeApplier } from "@/components/theme-applier"
import { Toaster } from "@/components/ui/sonner"

export default function ClientProviders({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <ThemeApplier />
      {children}
      <Toaster />
    </>
  )
}