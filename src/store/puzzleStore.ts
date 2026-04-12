import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AppState, PieceCount, PuzzlePiece, GridConfig, PuzzleStatus } from '../types/puzzle'

interface PuzzleStore extends AppState {
  setImage: (url: string) => void
  setPieceCount: (count: PieceCount) => void
  setGrid: (grid: GridConfig) => void
  setPieces: (pieces: PuzzlePiece[]) => void
  markPlaced: (id: string) => void
  setStatus: (status: PuzzleStatus) => void
  setStartTime: (time: number) => void
  setEndTime: (time: number) => void
  reset: () => void
}

const initialState: AppState = {
  status: 'idle',
  originalImage: null,
  pieceCount: null,
  grid: null,
  pieces: [],
  placedPieceIds: new Set(),
  startTime: null,
  endTime: null,
}

export const usePuzzleStore = create<PuzzleStore>()(
  persist(
    (set) => ({
      ...initialState,

      setImage: (url) => set({ originalImage: url }),
      setPieceCount: (count) => set({ pieceCount: count }),
      setGrid: (grid) => set({ grid }),
      setPieces: (pieces) => set({ pieces }),
      markPlaced: (id) => set((s) => ({
        placedPieceIds: new Set([...s.placedPieceIds, id])
      })),
      setStatus: (status) => set({ status }),
      setStartTime: (time) => set({ startTime: time }),
      setEndTime: (time) => set({ endTime: time }),
      reset: () => set({ ...initialState, placedPieceIds: new Set() }),
    }),
    {
      name: 'puzzelme-progress',

      // Set can't be JSON-serialised natively — convert to/from array
      storage: {
        getItem: (key) => {
          const raw = localStorage.getItem(key)
          if (!raw) return null
          const parsed = JSON.parse(raw)
          if (parsed?.state?.placedPieceIds) {
            parsed.state.placedPieceIds = new Set(parsed.state.placedPieceIds)
          }
          return parsed
        },
        setItem: (key, value) => {
          const serialisable = {
            ...value,
            state: {
              ...value.state,
              placedPieceIds: [...(value.state.placedPieceIds ?? [])],
            },
          }
          localStorage.setItem(key, JSON.stringify(serialisable))
        },
        removeItem: (key) => localStorage.removeItem(key),
      },
    }
  )
)
