'use client'

import { useEffect, useCallback, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, CheckCheck, Briefcase, Info, AlertTriangle, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/lib/api/hooks'
import { useSocket } from '@/hooks/useSocket'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  entityType?: string
  entityId?: string
  readAt: string | null
  createdAt: string
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

function notifIcon(type: string) {
  if (type.includes('CASE') || type.includes('ASSIGNED')) return <Briefcase className="w-4 h-4 text-primary" />
  if (type.includes('TAT') || type.includes('BREACH')) return <AlertTriangle className="w-4 h-4 text-amber-500" />
  if (type.includes('REPORT')) return <Clock className="w-4 h-4 text-violet-500" />
  return <Info className="w-4 h-4 text-muted-foreground" />
}

function NotifItem({
  n,
  onRead,
}: {
  n: Notification
  onRead: (id: string, entityId?: string) => void
}) {
  const isUnread = !n.readAt

  return (
    <button
      onClick={() => onRead(n.id, n.entityId)}
      className={cn(
        'w-full text-left flex gap-3 px-4 py-3 transition-colors',
        'hover:bg-muted/60',
        isUnread ? 'bg-primary/5' : '',
      )}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-0.5 w-7 h-7 rounded-full bg-muted flex items-center justify-center">
        {notifIcon(n.type)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <p className={cn('text-sm leading-snug', isUnread ? 'font-semibold' : 'font-medium')}>
            {n.title}
          </p>
          {isUnread && (
            <span className="flex-shrink-0 w-2 h-2 mt-1.5 rounded-full bg-primary" />
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2 leading-snug">{n.body}</p>
        <p className="text-[11px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
      </div>
    </button>
  )
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const qc = useQueryClient()
  const { on } = useSocket()

  const { data, isLoading } = useNotifications(1)
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  const notifications: Notification[] = data?.data ?? []
  const unread: number = data?.unread ?? 0

  // Listen for live WebSocket notifications
  useEffect(() => {
    const off = on('notification:new', (notif: Notification) => {
      // Add to cache instantly without refetch
      qc.setQueryData(['notifications', 1], (prev: any) => {
        if (!prev) return prev
        return {
          ...prev,
          data: [notif, ...prev.data].slice(0, 20),
          unread: (prev.unread ?? 0) + 1,
        }
      })
      // Toast for visibility
      toast(notif.title, {
        description: notif.body,
        duration: 5000,
        icon: notifIcon(notif.type),
      })
    })
    return off
  }, [on, qc])

  const handleRead = useCallback(
    (id: string, entityId?: string) => {
      markRead.mutate(id)
      if (entityId) {
        router.push(`/operations/cases/${entityId}`)
        setOpen(false)
      }
    },
    [markRead, router],
  )

  const handleMarkAll = useCallback(() => {
    markAll.mutate()
  }, [markAll])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 relative hover:bg-secondary transition-all duration-200 group"
          aria-label={`Notifications${unread > 0 ? ` (${unread} unread)` : ''}`}
        >
          <Bell className="w-4 h-4 group-hover:scale-110 transition-transform" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 min-w-[16px] h-4 px-0.5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none animate-in zoom-in-50 duration-200">
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        sideOffset={8}
        className="w-96 p-0 shadow-xl rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-sm">Notifications</h3>
            {unread > 0 && (
              <Badge variant="secondary" className="h-5 text-xs px-1.5">
                {unread} new
              </Badge>
            )}
          </div>
          {unread > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
              onClick={handleMarkAll}
              disabled={markAll.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* List */}
        <ScrollArea className="max-h-[420px]">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex gap-3">
                  <Skeleton className="w-7 h-7 rounded-full flex-shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <Skeleton className="h-3.5 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-2.5 w-1/4" />
                  </div>
                </div>
              ))}
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-14 text-center">
              <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y divide-border/50">
              {notifications.map((n) => (
                <NotifItem key={n.id} n={n} onRead={handleRead} />
              ))}
            </div>
          )}
        </ScrollArea>

        {/* Footer */}
        {notifications.length > 0 && (
          <div className="border-t px-4 py-2.5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-muted-foreground hover:text-foreground h-7"
              onClick={() => { setOpen(false); router.push('/notifications') }}
            >
              View all notifications
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
