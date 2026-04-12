import type { PieceCount, GridConfig } from '../types/puzzle'

export function getGridConfig(
  pieceCount: PieceCount,
  width: number,
  height: number
): GridConfig {
  const ratio = width / height

  // calculate ideal cols, then try cols-1, cols, cols+1 and pick closest to pieceCount
  const cols = Math.round(Math.sqrt(pieceCount * ratio))
  const options = [cols - 1, cols, cols + 1].map(c => {
    if (c <= 0) return null
    const r = Math.round(pieceCount / c)
    return { cols: c, rows: r, total: c * r, diff: Math.abs(c * r - pieceCount) }
  }).filter(Boolean) as { cols: number, rows: number, total: number, diff: number }[]

  // pick option with smallest difference from target
  const best = options.reduce((a, b) => a.diff < b.diff ? a : b)

  return { cols: best.cols, rows: best.rows }
}