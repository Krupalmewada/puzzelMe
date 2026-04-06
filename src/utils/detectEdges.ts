import type { PuzzlePiece, GridConfig } from '../types/puzzle'

export type EdgeInfo = {
  isCorner: boolean
  isBorder: boolean
  isInner: boolean
  edges: {
    top: boolean
    bottom: boolean
    left: boolean
    right: boolean
  }
}

export function getEdgeInfo(piece: PuzzlePiece, grid: GridConfig): EdgeInfo {
  const edges = {
    top:    piece.row === 0,
    bottom: piece.row === grid.rows - 1,
    left:   piece.col === 0,
    right:  piece.col === grid.cols - 1,
  }

  const edgeCount = Object.values(edges).filter(Boolean).length

  return {
    isCorner: edgeCount === 2,
    isBorder: edgeCount === 1,
    isInner:  edgeCount === 0,
    edges,
  }
}