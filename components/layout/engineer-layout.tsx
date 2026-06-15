'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, MapPin, Clock, User } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/engineer',                    label: 'Home',   icon: Home },
  { href: '/engineer/cases',              label: 'Cases',  icon: Briefcase },
  { href: '/engineer/travel-expenses',    label: 'Travel', icon: MapPin },
  { href: '/engineer/punch-in-out',       label: 'Punch',  icon: Clock },
  { href: '/engineer/profile',            label: 'Profile',icon: User },
]

export function EngineerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col min-h-screen bg-background max-w-md mx-auto relative">
      {/* Main scrollable content — padding-bottom leaves room for bottom nav */}
      <main className="flex-1 overflow-y-auto pb-20">
        {children}
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto border-t border-border bg-background/95 backdrop-blur-sm z-50">
        <div className="flex">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/engineer'
              ? pathname === '/engineer'
              : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-1 flex flex-col items-center gap-1 py-3 text-[10px] font-medium transition-colors',
                  active
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
                {label}
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
