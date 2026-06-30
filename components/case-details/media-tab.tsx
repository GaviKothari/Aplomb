'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Camera, ImageOff, ZoomIn } from 'lucide-react'

interface MediaTabProps {
  media?: Array<{
    id: string
    cdnUrl?: string
    mediaType?: string
    category?: string
    caption?: string
    createdAt?: string
  }>
}

export function MediaTab({ media = [] }: MediaTabProps) {
  const [lightbox, setLightbox] = useState<string | null>(null)

  const photos = media.filter(m => !m.mediaType || m.mediaType === 'PHOTO')

  if (photos.length === 0) {
    return (
      <Card className="border-0 shadow-sm">
        <CardContent className="py-16 text-center">
          <Camera className="w-10 h-10 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm font-medium text-muted-foreground">No photos uploaded yet</p>
          <p className="text-xs text-muted-foreground/70 mt-1">
            Photos taken on-site by the engineer will appear here
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-0 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Camera className="w-4 h-4" />
            Site Photos
            <Badge variant="secondary" className="text-xs font-normal">{photos.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {photos.map((photo) => (
              <div
                key={photo.id}
                className="group relative aspect-square rounded-lg overflow-hidden border border-border cursor-pointer"
                onClick={() => photo.cdnUrl && setLightbox(photo.cdnUrl)}
              >
                {photo.cdnUrl ? (
                  <>
                    <img
                      src={photo.cdnUrl}
                      alt={photo.caption ?? 'Site photo'}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomIn className="w-6 h-6 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </>
                ) : (
                  <div className="w-full h-full bg-muted flex items-center justify-center">
                    <ImageOff className="w-6 h-6 text-muted-foreground/40" />
                  </div>
                )}
                {photo.caption && (
                  <div className="absolute bottom-0 inset-x-0 bg-black/50 px-2 py-1">
                    <p className="text-white text-xs truncate">{photo.caption}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <img
            src={lightbox}
            alt="Site photo"
            className="max-w-full max-h-full object-contain rounded-lg"
          />
          <button
            className="absolute top-4 right-4 text-white/70 hover:text-white text-2xl font-light"
            onClick={() => setLightbox(null)}
          >
            ✕
          </button>
        </div>
      )}
    </>
  )
}
