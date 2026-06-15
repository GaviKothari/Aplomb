'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { ChevronDown, Menu, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { navConfig } from '@/lib/nav-config'
import { useRole } from '@/hooks/useRole'

export function Sidebar() {
  const pathname = usePathname()
  const { role } = useRole()
  const [isOpen, setIsOpen] = useState(true)
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) =>
      prev.includes(href) ? prev.filter((i) => i !== href) : [...prev, href]
    )
  }

  // Filter items by role
  const isItemVisible = (visibleFor?: string[]) => {
    if (!visibleFor) return true
    return visibleFor.includes(role)
  }

  return (
    <>
      {/* Mobile toggle */}
      <div className="fixed top-0 left-0 z-40 md:hidden p-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          className="hover:bg-sidebar-accent"
        >
          {isOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 h-screen w-64 bg-sidebar border-r border-sidebar-border transition-all duration-300 z-50 md:z-0 md:relative md:translate-x-0 overflow-y-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo area */}
        <div className="p-6 border-b border-sidebar-border/50">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center shadow-md group-hover:shadow-lg transition-shadow duration-200">
              <span className="text-sidebar-primary-foreground font-bold text-sm">PV</span>
            </div>
            <span className="font-semibold text-sidebar-foreground hidden sm:inline group-hover:text-sidebar-primary transition-colors">
              PropVal
            </span>
          </div>
        </div>

        {/* Navigation sections */}
        <nav className="p-4 space-y-6">
          {navConfig.map((section) => {
            // Filter section items by role
            const visibleItems = section.items.filter((item) => isItemVisible(item.visibleFor))
            
            // Skip sections with no visible items
            if (visibleItems.length === 0) return null

            return (
              <div key={section.title}>
                <h3 className="px-2 text-xs font-semibold text-sidebar-foreground/50 uppercase tracking-wider mb-3">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {visibleItems.map((item) => {
                    const Icon = item.icon
                    const isActive =
                      pathname === item.href ||
                      pathname.startsWith(item.href + '/')
                    const hasChildren = item.children && item.children.length > 0
                    const isExpanded = expandedItems.includes(item.href)
                    // Filter children by role
                    const visibleChildren = item.children?.filter((child) => isItemVisible(child.visibleFor))

                    return (
                      <div key={item.href}>
                        <div
                          className={cn(
                            'flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-all duration-200 text-sidebar-foreground',
                            isActive
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-sidebar-accent/50 group-hover:bg-sidebar-accent'
                          )}
                          onClick={() => {
                            if (hasChildren && visibleChildren && visibleChildren.length > 0) {
                              toggleExpanded(item.href)
                            }
                          }}
                        >
                          <Link
                            href={item.href}
                            onClick={(e) => {
                              if (hasChildren && visibleChildren && visibleChildren.length > 0) {
                                e.preventDefault()
                              }
                              setIsOpen(false)
                            }}
                            className="flex items-center gap-3 flex-1 text-sm font-medium"
                          >
                            {Icon && <Icon className="w-4 h-4 flex-shrink-0" />}
                            <span>{item.title}</span>
                            {item.badge && (
                              <span className="ml-auto text-xs bg-sidebar-primary text-sidebar-primary-foreground px-2 py-0.5 rounded-full">
                                {item.badge}
                              </span>
                            )}
                          </Link>
                          {hasChildren && visibleChildren && visibleChildren.length > 0 && (
                            <ChevronDown
                              className={cn(
                                'w-4 h-4 transition-transform flex-shrink-0',
                                isExpanded ? 'rotate-180' : ''
                              )}
                            />
                          )}
                        </div>

                        {/* Submenu */}
                        {hasChildren && isExpanded && visibleChildren && visibleChildren.length > 0 && (
                          <div className="ml-6 mt-1 space-y-1 border-l border-sidebar-border pl-3">
                            {visibleChildren.map((child) => (
                              <Link
                                key={child.href}
                                href={child.href}
                                onClick={() => setIsOpen(false)}
                                className={cn(
                                  'block px-3 py-1.5 rounded text-sm transition-colors',
                                  pathname === child.href
                                    ? 'bg-sidebar-primary/10 text-sidebar-primary font-medium'
                                    : 'text-sidebar-foreground hover:bg-sidebar-accent'
                                )}
                              >
                                {child.title}
                              </Link>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </nav>
      </aside>

      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
