export function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, normA = 0, normB = 0
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }
  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

function avgBrightness(v: number[]): number {
  let sum = 0
  for (let i = 0; i < v.length; i++) sum += v[i]
  return sum / v.length
}

export function combinedScore(a: number[], b: number[]): number {
  const cosine = cosineSimilarity(a, b)

  // penalize if brightness is very different
  const brightA = avgBrightness(a)
  const brightB = avgBrightness(b)
  const brightDiff = Math.abs(brightA - brightB)
  const brightPenalty = brightDiff * 2 // heavy penalty for brightness mismatch

  return Math.max(0, cosine - brightPenalty)
}