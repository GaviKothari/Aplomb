'use client'

import { Sidebar } from './sidebar'
import { TopNav } from './top-nav'
import { ClientOnly } from '@/components/client-only'

interface AppLayoutProps {
  children: React.ReactNode
}

function TopNavSkeleton() {
  return (
    <div className="sticky top-0 z-30 h-[57px] border-b border-border/50 bg-background/80" />
  )
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />

      <div className="flex-1 flex flex-col min-h-screen min-w-0 md:ml-0">
        <ClientOnly fallback={<TopNavSkeleton />}>
          <TopNav />
        </ClientOnly>

        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          <div className="p-4 md:p-8 min-w-0">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
