/**
 * Cosine similarity on per-zone L2-normalized histograms.
 *
 * Because each zone is individually L2-normalised before the vectors are
 * concatenated, the dot product equals the average zone cosine similarity.
 * Two pieces with different zone patterns → low score.
 * Two pieces with matching zone patterns → high score.
 * Global statistics (same image source) no longer inflate all scores.
 */

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

export function combinedScore(a: number[], b: number[]): number {
  return cosineSimilarity(a, b)
}
