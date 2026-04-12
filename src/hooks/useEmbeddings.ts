import { useState, useCallback } from 'react'
import type { PuzzlePiece } from '../types/puzzle'
import { getLocalEmbedding, getModel } from '../utils/localEmbedding'

// Larger batches are fine — no API rate limits, running locally on GPU/CPU
const BATCH_SIZE = 10

export function useEmbeddings() {
  const [progress, setProgress] = useState(0)
  const [isProcessing, setIsProcessing] = useState(false)

  const generateEmbeddings = useCallback(async (
    pieces: PuzzlePiece[],
    onDone: (pieces: PuzzlePiece[]) => void
  ) => {
    setIsProcessing(true)
    setProgress(0)

    // Ensure model is loaded before batching (shows 0% while downloading)
    await getModel()

    const updatedPieces: PuzzlePiece[] = []

    for (let i = 0; i < pieces.length; i += BATCH_SIZE) {
      const batch = pieces.slice(i, i + BATCH_SIZE)

      const results = await Promise.all(
        batch.map(async (piece) => {
          try {
            const embedding = await getLocalEmbedding(piece.imageDataUrl)
            return { ...piece, embedding }
          } catch (err) {
            console.error(`Failed piece ${piece.id}:`, err)
            return piece // keep existing color-histogram embedding on failure
          }
        })
      )

      updatedPieces.push(...results)
      setProgress(Math.round(((i + BATCH_SIZE) / pieces.length) * 100))
    }

    setIsProcessing(false)
    onDone(updatedPieces)
  }, [])

  return { generateEmbeddings, progress, isProcessing }
}