import { useCallback } from 'react'
import type { PuzzlePiece } from '../types/puzzle'
import { combinedScore } from '../utils/cosineSimilarity'

export interface MatchResult {
  piece: PuzzlePiece
  score: number
}

export function useMatcher(pieces: PuzzlePiece[]) {
  const findMatches = useCallback((
    queryEmbedding: number[],
    topK: number = 3
  ): MatchResult[] => {
    return pieces
      .map((piece) => ({
        piece,
        score: combinedScore(queryEmbedding, piece.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  }, [pieces])

  return { findMatches }
}