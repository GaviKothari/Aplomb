'use client'

import { useState } from 'react'
import { AppLayout } from '@/components/layout/app-layout'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Database, Loader2, MapPin, Save } from 'lucide-react'
import { mockOfficeLocations } from '@/lib/mock-data'
import { useBackfillPropertyIntelligence } from '@/lib/api/hooks'

export default function SystemSettingsPage() {
  const [locations, setLocations] = useState(mockOfficeLocations)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState<any>({})
  const backfill = useBackfillPropertyIntelligence()

  const handleEdit = (location: any) => {
    setEditingId(location.id)
    setFormData(location)
  }

  const handleSave = () => {
    setLocations(locations.map((loc) => (loc.id === editingId ? formData : loc)))
    setEditingId(null)
  }

  const handleCancel = () => {
    setEditingId(null)
    setFormData({})
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">System Settings</h1>
          <p className="text-muted-foreground mt-2">Configure office locations and geofence parameters for attendance</p>
        </div>

        {/* Office Location Settings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="w-5 h-5" />
              Office Location Configuration
            </CardTitle>
            <CardDescription>Set up office locations for geofenced attendance</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {locations.map((location) => (
              <div key={location.id} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                {editingId === location.id ? (
                  <div className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div>
                        <label className="text-sm font-medium">Office Name</label>
                        <Input
                          value={formData.name || ''}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">City</label>
                        <Input
                          value={formData.city || ''}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="text-sm font-medium">Address</label>
                        <Input
                          value={formData.address || ''}
                          onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Latitude</label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={formData.latitude || ''}
                          onChange={(e) => setFormData({ ...formData, latitude: parseFloat(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Longitude</label>
                        <Input
                          type="number"
                          step="0.0001"
                          value={formData.longitude || ''}
                          onChange={(e) => setFormData({ ...formData, longitude: parseFloat(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Allowed Radius (meters)</label>
                        <Input
                          type="number"
                          value={formData.radiusInMeters || 100}
                          onChange={(e) => setFormData({ ...formData, radiusInMeters: parseInt(e.target.value) })}
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" onClick={handleCancel}>
                        Cancel
                      </Button>
                      <Button onClick={handleSave} className="gap-2">
                        <Save className="w-4 h-4" />
                        Save Changes
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-semibold text-lg">{location.name}</p>
                        <p className="text-sm text-muted-foreground">{location.address}</p>
                      </div>
                      <Badge className={location.isActive ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300' : 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300'}>
                        {location.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                    <div className="grid gap-3 md:grid-cols-2 text-sm">
                      <div className="flex gap-2">
                        <span className="font-medium">Latitude:</span>
                        <span className="text-muted-foreground font-mono">{location.latitude.toFixed(4)}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium">Longitude:</span>
                        <span className="text-muted-foreground font-mono">{location.longitude.toFixed(4)}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium">Radius:</span>
                        <span className="text-muted-foreground">{location.radiusInMeters} meters</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="font-medium">City:</span>
                        <span className="text-muted-foreground">{location.city}</span>
                      </div>
                    </div>
                    <div className="pt-2 border-t">
                      <Button variant="outline" size="sm" onClick={() => handleEdit(location)}>
                        Edit Location
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Map Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle>Map Preview</CardTitle>
            <CardDescription>Office locations and geofence radius visualization</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 rounded-lg h-96 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="w-12 h-12 text-blue-600 dark:text-blue-400 mx-auto mb-3" />
                <p className="font-medium text-slate-900 dark:text-slate-100">Map Integration Placeholder</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Integrate with Leaflet, Google Maps, or OpenStreetMap to display office locations with radius circles
                </p>
                <div className="mt-4 space-y-2 text-xs text-muted-foreground">
                  <p>Current Offices: {locations.length}</p>
                  <p>Active Locations: {locations.filter((l) => l.isActive).length}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Geofencing Configuration Reference */}
        <Card>
          <CardHeader>
            <CardTitle>Geofencing Quick Reference</CardTitle>
            <CardDescription>How the geofencing system works</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <p className="font-medium text-sm mb-1">Distance Calculation</p>
                <p className="text-xs text-muted-foreground">
                  Uses Haversine formula to calculate great-circle distance between employee location and office
                </p>
              </div>
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/20 rounded-lg border border-emerald-200 dark:border-emerald-800">
                <p className="font-medium text-sm mb-1">Radius Check</p>
                <p className="text-xs text-muted-foreground">
                  Employee can punch in only if distance ≤ configured radius (default 100m)
                </p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <p className="font-medium text-sm mb-1">Location Refresh</p>
                <p className="text-xs text-muted-foreground">
                  GPS position checked every 10-15 seconds for accurate real-time geofencing
                </p>
              </div>
            </div>

            <div className="pt-4 border-t space-y-3">
              <div>
                <p className="font-medium text-sm">Example Calculation:</p>
                <div className="mt-2 p-3 bg-slate-50 dark:bg-slate-800 rounded font-mono text-xs space-y-1">
                  <p>Office: 28.4595°N, 77.0829°E (Gurgaon)</p>
                  <p>Employee: 28.4608°N, 77.0841°E</p>
                  <p className="text-blue-600 dark:text-blue-400">Distance: ~145 meters</p>
                  <p className="text-emerald-600 dark:text-emerald-400">Status: Outside radius (exceeds 100m limit)</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Property Knowledge Base */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Database className="w-5 h-5" />
              Property Knowledge Base
            </CardTitle>
            <CardDescription>
              Index all existing cases into the comparable sales engine so prior valuations appear on new cases
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-lg border border-blue-100 bg-blue-50 dark:bg-blue-950/20 dark:border-blue-900 p-4 text-sm text-blue-800 dark:text-blue-300">
              <p className="font-medium mb-1">How it works</p>
              <p className="text-blue-700 dark:text-blue-400 text-xs leading-relaxed">
                Each finalized case is automatically indexed going forward. Use this one-time backfill
                to index all historical cases so the intelligence engine has full data from day one.
                The backfill runs in the background — you can leave this page immediately.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <Button
                onClick={() => backfill.mutate()}
                disabled={backfill.isPending || backfill.isSuccess}
                className="gap-2"
              >
                {backfill.isPending
                  ? <><Loader2 className="w-4 h-4 animate-spin" />Queuing cases…</>
                  : backfill.isSuccess
                  ? <><Database className="w-4 h-4" />Backfill Started</>
                  : <><Database className="w-4 h-4" />Backfill All Cases</>
                }
              </Button>
              {backfill.isSuccess && (
                <p className="text-sm text-emerald-600 dark:text-emerald-400">
                  ✓ {(backfill.data as any)?.total ?? 0} cases queued — indexing in background
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  )
}
