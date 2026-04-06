import { useState, useCallback } from 'react'
import type { PuzzlePiece } from '../types/puzzle'

export function useEmbeddings() {
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const generateEmbeddings = useCallback(async (
    pieces: PuzzlePiece[],
    onDone: (pieces: PuzzlePiece[]) => void
  ) => {
    setIsProcessing(true)

    // histograms already computed in sliceImage
    // just simulate progress for UX
    for (let i = 0; i <= 100; i += 10) {
      setProgress(i)
      await new Promise((r) => setTimeout(r, 80))
    }

    setIsProcessing(false)
    onDone(pieces)
  }, [])

  return { generateEmbeddings, progress, isProcessing }
}