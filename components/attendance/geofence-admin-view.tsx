'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { MapPin, CheckCircle2, AlertCircle } from 'lucide-react'
import { mockAttendance, mockEmployees, mockOfficeLocations } from '@/lib/mock-data'
import { calculateDistance, formatDistance } from '@/lib/geofence'

export function GeofenceAdminView({ date = '2024-03-15' }: { date?: string }) {
  const todayAttendance = mockAttendance.filter((a) => a.date === date)
  const primaryOffice = mockOfficeLocations[0]

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          Attendance with Geofence Data
        </CardTitle>
        <CardDescription>Shows punch location verification and distance from office</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-3 px-4 font-semibold">Employee</th>
                <th className="text-center py-3 px-4 font-semibold">Punch In</th>
                <th className="text-center py-3 px-4 font-semibold">Punch Out</th>
                <th className="text-center py-3 px-4 font-semibold">Distance (In)</th>
                <th className="text-center py-3 px-4 font-semibold">Distance (Out)</th>
                <th className="text-center py-3 px-4 font-semibold">Within Radius</th>
                <th className="text-center py-3 px-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {todayAttendance.map((att) => {
                const employee = mockEmployees.find((e) => e.id === att.employeeId)
                const inDistance = att.latitude && att.longitude ? calculateDistance(att.latitude, att.longitude, primaryOffice.latitude, primaryOffice.longitude) : null
                const isWithinRadius = inDistance ? inDistance <= primaryOffice.radiusInMeters : false

                return (
                  <tr key={att.id} className="border-b hover:bg-muted/50 transition-colors">
                    <td className="py-3 px-4 font-medium">{employee?.name}</td>
                    <td className="py-3 px-4 text-center text-sm">{att.punchIn || '--'}</td>
                    <td className="py-3 px-4 text-center text-sm">{att.punchOut || '--'}</td>
                    <td className="py-3 px-4 text-center">
                      {inDistance ? (
                        <span className="text-xs font-medium">{formatDistance(inDistance)}</span>
                      ) : (
                        <span className="text-muted-foreground">--</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <span className="text-xs font-medium">--</span>
                    </td>
                    <td className="py-3 px-4 text-center">
                      {isWithinRadius ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Yes
                        </Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                          <AlertCircle className="w-3 h-3 mr-1" />
                          No
                        </Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {att.status === 'present' ? (
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300">
                          Present
                        </Badge>
                      ) : (
                        <Badge className="bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300">
                          {att.status}
                        </Badge>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
