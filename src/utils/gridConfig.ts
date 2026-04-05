import type { PieceCount, GridConfig } from '../types/puzzle'

const LANDSCAPE: Record<PieceCount, GridConfig> = {
  25:   { cols: 5,  rows: 5  },
  100:  { cols: 10, rows: 10 },
  250:  { cols: 25, rows: 10 },
  500:  { cols: 25, rows: 20 },
  1000: { cols: 40, rows: 25 },
}

const PORTRAIT: Record<PieceCount, GridConfig> = {
  25:   { cols: 5,  rows: 5  },
  100:  { cols: 10, rows: 10 },
  250:  { cols: 10, rows: 25 },
  500:  { cols: 20, rows: 25 },
  1000: { cols: 25, rows: 40 },
}

export function getGridConfig(
  pieceCount: PieceCount,
  imageWidth: number,
  imageHeight: number
): GridConfig {
  return imageWidth >= imageHeight
    ? LANDSCAPE[pieceCount]
    : PORTRAIT[pieceCount]
}