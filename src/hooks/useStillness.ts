import { useRef, useCallback } from 'react'

export function useStillness(threshold: number = 15) {
  const prevFrameRef = useRef<ImageData | null>(null)

  const checkStillness = useCallback((
    video: HTMLVideoElement
  ): boolean => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(video, 0, 0, 64, 64)
    const current = ctx.getImageData(0, 0, 64, 64)

    if (!prevFrameRef.current) {
      prevFrameRef.current = current
      return false
    }

    let diff = 0
    for (let i = 0; i < current.data.length; i += 4) {
      diff += Math.abs(current.data[i] - prevFrameRef.current.data[i])
    }

    const avgDiff = diff / (64 * 64)
    prevFrameRef.current = current

    return avgDiff < threshold
  }, [threshold])

  return { checkStillness }
}