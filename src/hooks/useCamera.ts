import { useRef, useState, useCallback, useEffect } from 'react'
import { spatialHistogramFromUrl } from '../utils/colorHistogram'

export function useCamera() {
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

  const captureEmbedding = useCallback(async (): Promise<number[] | null> => {
    if (!videoRef.current || !isReady) return null

    const video = videoRef.current
    const canvas = document.createElement('canvas')
    const cropSize = Math.min(video.videoWidth, video.videoHeight) * 0.5
    const startX = (video.videoWidth - cropSize) / 2
    const startY = (video.videoHeight - cropSize) / 2

    canvas.width = 224
    canvas.height = 224
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(video, startX, startY, cropSize, cropSize, 0, 0, 224, 224)

    const dataUrl = canvas.toDataURL('image/png')
    return spatialHistogramFromUrl(dataUrl)
  }, [isReady])

  return { videoRef, isReady, error, startCamera, stopCamera, captureEmbedding }
}
