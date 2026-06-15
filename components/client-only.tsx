'use client'

import { useEffect, useState, ReactNode } from 'react'

interface ClientOnlyProps {
  children: ReactNode
  /** Rendered on the server and during the first client frame before hydration */
  fallback?: ReactNode
}

/**
 * Prevents SSR of children that use client-only APIs (Clerk, localStorage, useTheme, etc.)
 * that change the React fiber tree shape between server and client, causing Radix useId()
 * mismatches for every component that follows in the tree.
 */
export function ClientOnly({ children, fallback = null }: ClientOnlyProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  return mounted ? <>{children}</> : <>{fallback}</>
}
