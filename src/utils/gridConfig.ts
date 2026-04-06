
import type { PieceCount, GridConfig } from '../types/puzzle'

export function getGridConfig(
  pieceCount: PieceCount,
  imageWidth: number,
  imageHeight: number
): GridConfig {
  const ratio = imageWidth / imageHeight
  const cols = Math.round(Math.sqrt(pieceCount * ratio))
  const rows = Math.round(pieceCount / cols)
  return { cols, rows }
}