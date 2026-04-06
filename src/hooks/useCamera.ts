import { useRef, useState, useCallback, useEffect } from 'react'
import { getPixelVector } from '../utils/colorHistogram'

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

  const captureEmbedding = useCallback((): number[] | null => {
    if (!videoRef.current || !isReady) return null

    const video = videoRef.current
    const canvas = document.createElement('canvas')

    // crop center square where guide box is
    const cropSize = Math.min(video.videoWidth, video.videoHeight) * 0.5
    const startX = (video.videoWidth - cropSize) / 2
    const startY = (video.videoHeight - cropSize) / 2

    canvas.width = cropSize
    canvas.height = cropSize
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(video, startX, startY, cropSize, cropSize, 0, 0, cropSize, cropSize)

    return getPixelVector(canvas)
  }, [isReady])

  return { videoRef, isReady, error, startCamera, stopCamera, captureEmbedding }
}