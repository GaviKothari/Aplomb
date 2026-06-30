'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Briefcase, MapPin, Clock, User, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'

const NAV = [
  { href: '/engineer',                 label: 'Home',    icon: Home },
  { href: '/engineer/cases',           label: 'Cases',   icon: Briefcase },
  { href: '/engineer/travel-expenses', label: 'Travel',  icon: MapPin },
  { href: '/engineer/leave',           label: 'Leave',   icon: CalendarDays },
  { href: '/engineer/punch-in-out',    label: 'Punch',   icon: Clock },
  { href: '/engineer/profile',         label: 'Profile', icon: User },
]

export function EngineerLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1 overflow-y-auto pb-24">
        {children}
      </main>

      {/* Bottom navigation bar */}
      <nav className="fixed bottom-0 inset-x-0 z-50 bg-background/95 backdrop-blur-md border-t border-border">
        {/* Safe area for iPhone home indicator */}
        <div className="flex items-center pb-safe">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = href === '/engineer'
              ? pathname === '/engineer'
              : pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center gap-1 py-3 min-h-[64px] transition-colors',
                  active ? 'text-blue-600 dark:text-blue-400' : 'text-muted-foreground'
                )}
              >
                <div className={cn(
                  'flex items-center justify-center w-10 h-6 rounded-full transition-all',
                  active && 'bg-blue-100 dark:bg-blue-900/40'
                )}>
                  <Icon className={cn('h-5 w-5', active && 'stroke-[2.5]')} />
                </div>
                <span className={cn('text-[10px] font-medium', active && 'font-semibold')}>
                  {label}
                </span>
              </Link>
            )
          })}
        </div>
      </nav>
    </div>
  )
}
