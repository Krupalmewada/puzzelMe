export type PieceCount = 25 | 100 | 250 | 500 | 1000

export interface GridConfig {
  rows: number
  cols: number
}

export interface PuzzlePiece {
  id: string
  row: number
  col: number
  x: number
  y: number
  width: number
  height: number
  imageDataUrl: string
  embedding: number[]
}

export type PuzzleStatus = 'idle' | 'setup' | 'processing' | 'solving' | 'complete'

export interface AppState {
  status: PuzzleStatus
  originalImage: string | null
  pieceCount: PieceCount | null
  grid: GridConfig | null
  pieces: PuzzlePiece[]
  placedPieceIds: Set<string>
  startTime: number | null
  endTime: number | null
}