'use client'

import { useUser, useClerk } from '@clerk/nextjs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { LogOut, Mail, Phone, Shield } from 'lucide-react'

export default function EngineerProfilePage() {
  const { user }   = useUser()
  const { signOut } = useClerk()

  const initials = [user?.firstName?.[0], user?.lastName?.[0]].filter(Boolean).join('') || 'E'

  return (
    <div className="min-h-screen bg-gray-50 p-4 space-y-4">
      <h1 className="text-xl font-bold text-gray-900 pt-2">Profile</h1>

      {/* Avatar + name */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm py-6 flex flex-col items-center gap-3">
        <Avatar className="h-20 w-20">
          <AvatarImage src={user?.imageUrl} />
          <AvatarFallback className="text-2xl font-bold bg-blue-100 text-blue-700">{initials}</AvatarFallback>
        </Avatar>
        <div className="text-center">
          <p className="font-bold text-lg text-gray-900">{user?.fullName ?? 'Engineer'}</p>
          <p className="text-xs text-gray-500">Site Engineer</p>
        </div>
      </div>

      {/* Contact details */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm px-4 py-3 space-y-3">
        {user?.primaryEmailAddress?.emailAddress && (
          <div className="flex items-center gap-3 py-1">
            <Mail className="h-4 w-4 text-gray-400 shrink-0" />
            <p className="text-sm text-gray-800 truncate">{user.primaryEmailAddress.emailAddress}</p>
          </div>
        )}
        {user?.primaryPhoneNumber?.phoneNumber && (
          <div className="flex items-center gap-3 py-1">
            <Phone className="h-4 w-4 text-gray-400 shrink-0" />
            <p className="text-sm text-gray-800">{user.primaryPhoneNumber.phoneNumber}</p>
          </div>
        )}
        <div className="flex items-center gap-3 py-1">
          <Shield className="h-4 w-4 text-gray-400 shrink-0" />
          <p className="text-sm text-gray-800 capitalize">
            {(user?.publicMetadata?.role as string) ?? 'engineer'} role
          </p>
        </div>
      </div>

      {/* Sign out */}
      <button
        className="w-full flex items-center justify-center gap-2 bg-red-600 active:bg-red-700 text-white font-semibold py-3.5 rounded-2xl text-sm"
        onClick={() => signOut({ redirectUrl: '/sign-in' })}
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </button>
    </div>
  )
}
