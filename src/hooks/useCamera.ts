import { useRef, useState, useCallback, useEffect } from 'react'
import { queryHistogramFromUrl, type HistogramConfig } from '../utils/colorHistogram'
import type { PieceRegion } from '../utils/detectPiece'

/**
 * Higher capture resolution (512×512) preserves more detail for the histogram
 * pipeline. The histogram computation does its own downscale to the config's
 * `resize` value, so feeding it a higher-res input means less information is
 * lost at the capture stage.
 *
 * Also uses PNG encoding (lossless) instead of JPEG to avoid introducing
 * compression artifacts that differ from the clean reference crops.
 */
const CAPTURE_SIZE = 512

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
   *
   * v2: Higher capture resolution (512px) and PNG encoding.
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
    canvas.width = CAPTURE_SIZE
    canvas.height = CAPTURE_SIZE
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!
    ctx.drawImage(video, srcX, srcY, srcW, srcH, 0, 0, CAPTURE_SIZE, CAPTURE_SIZE)

    // Use PNG (lossless) to avoid JPEG compression artifacts that differ
    // systematically from clean reference crops
    const dataUrl = canvas.toDataURL('image/png')
    return queryHistogramFromUrl(dataUrl, cfg)
  }, [isReady, cfg])

  return { videoRef, isReady, error, startCamera, stopCamera, captureEmbedding }
}
