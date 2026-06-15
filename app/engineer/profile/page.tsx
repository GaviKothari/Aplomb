'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, Mail, Phone, Shield } from 'lucide-react'

export default function EngineerProfilePage() {
  const { user } = useUser()
  const { signOut } = useClerk()

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('') || 'E'

  return (
    <div className="p-4 space-y-5">
      <h1 className="text-xl font-bold pt-2">Profile</h1>

      {/* Avatar + name */}
      <Card>
        <CardContent className="pt-6 pb-6 flex flex-col items-center gap-3">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user?.imageUrl} />
            <AvatarFallback className="text-2xl font-bold">{initials}</AvatarFallback>
          </Avatar>
          <div className="text-center">
            <p className="font-bold text-lg">{user?.fullName ?? 'Engineer'}</p>
            <p className="text-xs text-muted-foreground">Site Engineer</p>
          </div>
        </CardContent>
      </Card>

      {/* Contact details */}
      <Card>
        <CardContent className="pt-4 pb-4 space-y-3">
          {user?.primaryEmailAddress?.emailAddress && (
            <div className="flex items-center gap-3">
              <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm truncate">{user.primaryEmailAddress.emailAddress}</p>
            </div>
          )}
          {user?.primaryPhoneNumber?.phoneNumber && (
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
              <p className="text-sm">{user.primaryPhoneNumber.phoneNumber}</p>
            </div>
          )}
          <div className="flex items-center gap-3">
            <Shield className="h-4 w-4 text-muted-foreground shrink-0" />
            <p className="text-sm">
              {(user?.publicMetadata?.role as string) ?? 'engineer'} role
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Sign out */}
      <Button
        variant="destructive"
        className="w-full gap-2"
        onClick={() => signOut({ redirectUrl: '/sign-in' })}
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  )
}
