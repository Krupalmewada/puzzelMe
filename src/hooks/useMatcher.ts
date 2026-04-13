import { useCallback, useRef } from 'react'
import type { PuzzlePiece } from '../types/puzzle'
import { combinedScore } from '../utils/cosineSimilarity'
import { histogramConfigForCount } from '../utils/colorHistogram'

export interface MatchResult {
  piece: PuzzlePiece
  score: number
}

/**
 * Adaptive matcher with per-zone online drift correction.
 *
 * v2 improvements:
 *  - Per-segment drift: The embedding has multiple segments (histograms,
 *    HSV moments, LAB moments). We compute drift independently per segment
 *    and apply the appropriate correction to each segment of the query.
 *    This is more accurate than a single global drift vector because
 *    lighting affects color histograms differently than color moments.
 *  - Exponential weighting: Recent confirmations are weighted more heavily
 *    (EMA) since lighting conditions may change as the user moves pieces.
 *  - Accepts a placedIds set to filter out already-placed pieces from results.
 */
export function useMatcher(pieces: PuzzlePiece[]) {
  const confirmedPairs = useRef<Array<{ q: number[]; r: number[] }>>([])
  const drift = useRef<number[] | null>(null)
  const calibrationCount = useRef(0)

  /**
   * Recompute drift using exponential weighting.
   * Recent pairs get higher weight (decay = 0.85 per older pair).
   */
  const recomputeDrift = useCallback((pairs: Array<{ q: number[]; r: number[] }>) => {
    if (pairs.length === 0) {
      drift.current = null
      return
    }

    const len = pairs[0].q.length
    const newDrift = new Array(len).fill(0)
    const DECAY = 0.85

    let totalWeight = 0
    for (let p = 0; p < pairs.length; p++) {
      // Most recent pair gets weight 1, older pairs decay
      const age = pairs.length - 1 - p
      const weight = Math.pow(DECAY, age)
      totalWeight += weight
      for (let i = 0; i < len; i++) {
        newDrift[i] += weight * (pairs[p].r[i] - pairs[p].q[i])
      }
    }

    for (let i = 0; i < len; i++) newDrift[i] /= totalWeight
    drift.current = newDrift
  }, [])

  const findMatches = useCallback((
    queryEmbedding: number[],
    topK: number = 3,
    placedIds?: Set<string>,
  ): MatchResult[] => {
    // Apply learned drift correction to the query embedding
    let corrected = queryEmbedding
    if (drift.current && drift.current.length === queryEmbedding.length) {
      corrected = queryEmbedding.map((v, i) => v + drift.current![i])
    }

    return pieces
      // Filter out already-placed pieces
      .filter((piece) => !placedIds || !placedIds.has(piece.id))
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

    // Recompute drift with exponential weighting
    recomputeDrift(confirmedPairs.current)
  }, [pieces, recomputeDrift])

  return { findMatches, learnFromConfirmation, calibrationCount }
}
