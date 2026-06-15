'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export function NavProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [visible, setVisible] = useState(false)
  const [width, setWidth] = useState(0)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const prevPath = useRef(pathname)

  useEffect(() => {
    const currentPath = pathname + searchParams.toString()
    const prevPathStr = prevPath.current

    if (currentPath === prevPathStr) return
    prevPath.current = currentPath

    // Start progress
    setVisible(true)
    setWidth(20)

    timerRef.current = setInterval(() => {
      setWidth((w) => {
        if (w >= 85) {
          clearInterval(timerRef.current!)
          return 85
        }
        return w + Math.random() * 12
      })
    }, 150)

    // Complete shortly after navigation settles
    const completeTimer = setTimeout(() => {
      clearInterval(timerRef.current!)
      setWidth(100)
      setTimeout(() => {
        setVisible(false)
        setWidth(0)
      }, 300)
    }, 600)

    return () => {
      clearInterval(timerRef.current!)
      clearTimeout(completeTimer)
    }
  }, [pathname, searchParams])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 z-[9999] h-[3px] bg-primary transition-all duration-200 ease-out shadow-[0_0_8px_1px] shadow-primary/60"
      style={{ width: `${width}%` }}
    />
  )
}
