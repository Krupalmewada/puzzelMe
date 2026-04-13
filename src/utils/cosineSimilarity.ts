/**
 * Similarity scoring for multi-feature embeddings.
 *
 * v2: The embedding is now a concatenation of:
 *   [multi-scale histograms | HSV moments | LAB moments]
 *
 * combinedScore() computes cosine similarity on each segment independently
 * and returns a weighted combination. This prevents the histogram portion
 * (which is much larger) from drowning out the moment features.
 *
 * Segment boundaries are determined from the HistogramConfig so the weights
 * stay correct regardless of piece count / resolution tier.
 */

import { histogramConfigForCount, type HistogramConfig } from './colorHistogram'

export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    na  += a[i] * a[i]
    nb  += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

/** Cosine similarity on a slice of two vectors. */
function sliceCosine(a: number[], b: number[], start: number, len: number): number {
  let dot = 0, na = 0, nb = 0
  const end = Math.min(start + len, a.length)
  for (let i = start; i < end; i++) {
    dot += a[i] * b[i]
    na  += a[i] * a[i]
    nb  += b[i] * b[i]
  }
  if (na === 0 || nb === 0) return 0
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

/**
 * Compute segment boundaries for the embedding based on config.
 */
function getSegmentInfo(cfg: HistogramConfig) {
  const { zones, hueBins, grayBins, scales } = cfg

  // Multi-scale histogram length
  let histLen = 0
  for (const s of scales) {
    histLen += s * s * (hueBins + grayBins)
  }

  // HSV moments: 6 floats per zone (meanH, stdH, meanS, stdS, meanV, stdV)
  const hsvMomLen = zones * zones * 6

  // LAB moments: 6 floats per zone (meanL, stdL, meanA, stdA, meanB, stdB)
  const labMomLen = zones * zones * 6

  return { histLen, hsvMomLen, labMomLen }
}

// Cache for segment detection — avoids recomputing on every call
let cachedEmbeddingLen = -1
let cachedSegments = { histLen: 0, hsvMomLen: 0, labMomLen: 0 }

function ensureSegments(embeddingLen: number) {
  if (cachedEmbeddingLen === embeddingLen) return

  // Try to detect piece count tier from embedding length
  for (const count of [25, 100, 250, 500, 1000]) {
    const cfg = histogramConfigForCount(count)
    const seg = getSegmentInfo(cfg)
    const total = seg.histLen + seg.hsvMomLen + seg.labMomLen
    if (total === embeddingLen) {
      cachedEmbeddingLen = embeddingLen
      cachedSegments = seg
      return
    }
  }

  // fallback: treat everything as one segment
  cachedEmbeddingLen = embeddingLen
  cachedSegments = { histLen: embeddingLen, hsvMomLen: 0, labMomLen: 0 }
}

/**
 * Combined weighted score across histogram, HSV moments, and LAB moments.
 *
 * Weights:
 *  - Histogram:   0.50 (spatial color distribution — primary signal)
 *  - HSV moments: 0.25 (robust color statistics)
 *  - LAB moments: 0.25 (perceptually uniform color statistics)
 */
export function combinedScore(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0

  ensureSegments(a.length)
  const { histLen, hsvMomLen, labMomLen } = cachedSegments

  // If we couldn't detect segments, fall back to plain cosine
  if (hsvMomLen === 0 && labMomLen === 0) {
    return cosineSimilarity(a, b)
  }

  const histSim    = histLen > 0   ? sliceCosine(a, b, 0, histLen) : 0
  const hsvMomSim  = hsvMomLen > 0 ? sliceCosine(a, b, histLen, hsvMomLen) : 0
  const labMomSim  = labMomLen > 0 ? sliceCosine(a, b, histLen + hsvMomLen, labMomLen) : 0

  return 0.50 * histSim + 0.25 * hsvMomSim + 0.25 * labMomSim
}
