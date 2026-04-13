import { useCallback, useRef } from 'react'
import type { PuzzlePiece } from '../types/puzzle'
import { combinedScore } from '../utils/cosineSimilarity'

export interface MatchResult {
  piece: PuzzlePiece
  score: number
}

/**
 * Adaptive matcher with online drift correction.
 *
 * Each time the user confirms a placement, we record the (query, reference)
 * embedding pair. The difference  ref - query  is the "lighting drift" —
 * the systematic offset between camera photos and clean digital crops.
 * We average that drift over all confirmed pairs and add it to every future
 * query before scoring, progressively closing the domain gap as more pieces
 * are confirmed.
 */
export function useMatcher(pieces: PuzzlePiece[]) {
  const confirmedPairs = useRef<Array<{ q: number[]; r: number[] }>>([])
  const drift = useRef<number[] | null>(null)
  const calibrationCount = useRef(0)

  const findMatches = useCallback((
    queryEmbedding: number[],
    topK: number = 3
  ): MatchResult[] => {
    // Apply learned drift correction to the query embedding
    let corrected = queryEmbedding
    if (drift.current && drift.current.length === queryEmbedding.length) {
      corrected = queryEmbedding.map((v, i) => v + drift.current![i])
    }

    return pieces
      .map((piece) => ({
        piece,
        score: combinedScore(corrected, piece.embedding),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK)
  }, [pieces])

  /**
   * Call this when the user confirms a piece placement.
   * queryEmb  = the camera embedding that was scanned
   * pieceId   = the confirmed piece (we look up its reference embedding)
   */
  const learnFromConfirmation = useCallback((queryEmb: number[], pieceId: string) => {
    const ref = pieces.find(p => p.id === pieceId)
    if (!ref || ref.embedding.length !== queryEmb.length) return

    confirmedPairs.current.push({ q: queryEmb, r: ref.embedding })
    calibrationCount.current = confirmedPairs.current.length

    // Recompute drift = mean(refEmb - queryEmb) across all confirmed pairs
    const len = queryEmb.length
    const newDrift = new Array(len).fill(0)
    for (const pair of confirmedPairs.current) {
      for (let i = 0; i < len; i++) {
        newDrift[i] += pair.r[i] - pair.q[i]
      }
    }
    const n = confirmedPairs.current.length
    for (let i = 0; i < len; i++) newDrift[i] /= n
    drift.current = newDrift
  }, [pieces])

  return { findMatches, learnFromConfirmation, calibrationCount }
}