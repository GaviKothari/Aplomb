import { OfficeLocation } from '@/types'

// Haversine formula to calculate distance between two GPS coordinates
// Returns distance in meters
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000 // Earth's radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLon = ((lon2 - lon1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
  const distance = R * c
  return distance
}

// Check if location is within geofence radius
export function isWithinGeofence(
  userLat: number,
  userLon: number,
  officeLat: number,
  officeLon: number,
  radiusInMeters: number
): boolean {
  const distance = calculateDistance(userLat, userLon, officeLat, officeLon)
  return distance <= radiusInMeters
}

// Validate location against multiple office locations
export interface GeofenceValidationResult {
  isWithinAnyOffice: boolean
  matchedOffice: OfficeLocation | null
  distanceFromNearest: number
  nearestOffice: OfficeLocation | null
  allOfficeDistances: Array<{ office: OfficeLocation; distance: number }>
}

export function validateLocationAgainstOffices(
  userLat: number,
  userLon: number,
  offices: OfficeLocation[]
): GeofenceValidationResult {
  const allDistances = offices
    .filter((office) => office.isActive)
    .map((office) => ({
      office,
      distance: calculateDistance(userLat, userLon, office.latitude, office.longitude),
    }))
    .sort((a, b) => a.distance - b.distance)

  const matchedOffice = allDistances.find(
    (item) => item.distance <= item.office.radiusInMeters
  )

  return {
    isWithinAnyOffice: !!matchedOffice,
    matchedOffice: matchedOffice?.office || null,
    distanceFromNearest: allDistances[0]?.distance || 0,
    nearestOffice: allDistances[0]?.office || null,
    allOfficeDistances: allDistances,
  }
}

// Format distance for display
export function formatDistance(meters: number): string {
  if (meters < 1000) {
    return `${Math.round(meters)} m`
  }
  return `${(meters / 1000).toFixed(2)} km`
}

// Get current user location using geolocation API
export function getCurrentLocation(): Promise<{ latitude: number; longitude: number }> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser'))
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      (error) => {
        reject(error)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    )
  })
}

// Watch user location continuously
export function watchLocation(
  onLocationChange: (location: { latitude: number; longitude: number }) => void,
  onError?: (error: GeolocationPositionError) => void
): number {
  if (!navigator.geolocation) {
    console.error('Geolocation is not supported')
    return 0
  }

  return navigator.geolocation.watchPosition(
    (position) => {
      onLocationChange({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
      })
    },
    onError,
    {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    }
  )
}

// Stop watching location
export function stopWatchingLocation(watchId: number): void {
  if (watchId) {
    navigator.geolocation.clearWatch(watchId)
  }
}
