'use client'

import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'
import { ClientOnly } from '@/components/client-only'

interface AppLayoutProps {
  children: React.ReactNode
}

/** Placeholder that matches TopNav height to prevent layout shift during hydration */
function TopNavSkeleton() {
  return (
    <div className="sticky top-0 z-30 h-[57px] border-b border-border/50 bg-background/80" />
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <Sidebar />

      {/* Main content — min-w-0 prevents flex child from expanding past viewport */}
      <div className="flex-1 flex flex-col min-h-screen min-w-0 md:ml-0">
        {/*
          TopNav is wrapped in ClientOnly to prevent SSR.
          TopNav uses Clerk hooks + Radix Select (RoleSwitcher) + Radix DropdownMenu.
          Clerk's internal providers add extra React fiber nodes on the client, shifting
          all subsequent Radix useId() counters and causing aria-controls mismatches.
          Skipping SSR for TopNav keeps the Radix ID counter stable for page content.
        */}
        <ClientOnly fallback={<TopNavSkeleton />}>
          <TopNav />
        </ClientOnly>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="p-4 md:p-8 min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
