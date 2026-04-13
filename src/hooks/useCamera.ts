import { useRef, useState, useCallback, useEffect } from 'react'
import { queryHistogramFromUrl, type HistogramConfig } from '../utils/colorHistogram'
import type { PieceRegion } from '../utils/detectPiece'

export function useCamera(cfg: HistogramConfig) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return () => stopCamera()
  }, [])

  const startCamera = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: 1280, height: 720 }
      })
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = () => {
          videoRef.current!.play().then(() => setIsReady(true))
        }
      }
    } catch {
      setError('Camera access denied. Please allow camera permission.')
    }
  }, [])

  const stopCamera = useCallback(() => {
    const stream = videoRef.current?.srcObject as MediaStream
    stream?.getTracks().forEach((t) => t.stop())
    setIsReady(false)
  }, [])

  /**
   * Capture the piece and compute its histogram embedding.
   * If a detected region is provided, crop to that region exactly.
   * Otherwise fall back to the centre 60% of the frame.
   */
  const captureEmbedding = useCallback(async (
    region?: PieceRegion | null
  ): Promise<number[] | null> => {
    if (!videoRef.current || !isReady) return null

    const video = videoRef.current
    let srcX: number, srcY: number, srcW: number, srcH: number

    if (region && region.w > 20 && region.h > 20) {
      srcX = region.x; srcY = region.y; srcW = region.w; srcH = region.h
    } else {
      const cropSize = Math.min(video.videoWidth, video.videoHeight) * 0.6
      srcX = (video.videoWidth  - cropSize) / 2
      srcY = (video.videoHeight - cropSize) / 2
      srcW = cropSize; srcH = cropSize
    }

    const canvas = document.createElement('canvas')
    canvas.width = 224
    canvas.height = 224
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, 224, 224)

    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    return queryHistogramFromUrl(dataUrl, cfg)
  }, [isReady, cfg])

  return { videoRef, isReady, error, startCamera, stopCamera, captureEmbedding }
}
