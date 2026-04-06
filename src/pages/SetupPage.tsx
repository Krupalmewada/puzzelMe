import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/layout/AppShell'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import PixelText from '../components/ui/PixelText'
import PillSelector from '../components/ui/PillSelector'
import UploadZone from '../features/upload/UploadZone'
import { usePuzzleStore } from '../store/puzzleStore'
import type { PieceCount } from '../types/puzzle'
import { getGridConfig } from '../utils/gridConfig'

const PIECE_OPTIONS: PieceCount[] = [25, 100, 250, 500, 1000]

export default function SetupPage() {
  const navigate = useNavigate()
  const { setImage, setPieceCount, setGrid, setStatus, originalImage, pieceCount } = usePuzzleStore()
  const [localImage, setLocalImage] = useState<string | null>(originalImage)
  const [localCount, setLocalCount] = useState<PieceCount | null>(pieceCount)
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null)

  const handleImageUpload = (url: string) => {
    setLocalImage(url)
    const img = new Image()
    img.onload = () => setImgSize({ w: img.width, h: img.height })
    img.src = url
  }

  const getGridPreview = () => {
    if (!localCount || !imgSize) return null
    const grid = getGridConfig(localCount, imgSize.w, imgSize.h)
    const pieceW = Math.floor(imgSize.w / grid.cols)
    const pieceH = Math.floor(imgSize.h / grid.rows)
    return { grid, pieceW, pieceH }
  }

  const preview = getGridPreview()
  const canProceed = localImage && localCount

  const handleStart = () => {
    if (!localImage || !localCount || !imgSize) return
    const grid = getGridConfig(localCount, imgSize.w, imgSize.h)
    setImage(localImage)
    setPieceCount(localCount)
    setGrid(grid)
    setStatus('processing')
    navigate('/processing')
  }

  return (
    <AppShell>
      <div className="flex flex-col items-center gap-6 w-full max-w-lg">

        {/* Header */}
        <div className="flex items-center gap-3 self-start">
          <button
            onClick={() => navigate('/')}
            className="text-sky-400 font-body text-sm hover:text-sky-600 transition-colors"
          >
            ← Back
          </button>
        </div>

        <PixelText text="SETUP" size="md" />

        {/* Upload card */}
        <Card className="w-full flex flex-col gap-5">
          <div>
            <p className="font-body font-semibold text-sky-700 text-sm mb-3">
              1. Upload your puzzle image
            </p>
            <UploadZone
              onImageUpload={handleImageUpload}
              uploadedImage={localImage}
            />
            {localImage && (
              <button
                onClick={() => { setLocalImage(null); setImgSize(null) }}
                className="mt-2 text-xs text-sky-400 hover:text-sky-600 font-body transition-colors"
              >
                × Remove image
              </button>
            )}
          </div>

          {/* Piece count */}
          <div>
            <p className="font-body font-semibold text-sky-700 text-sm mb-3">
              2. How many pieces is your puzzle?
            </p>
            <PillSelector
              options={PIECE_OPTIONS}
              selected={localCount}
              onSelect={setLocalCount}
            />
          </div>

          {/* Grid preview */}
          {preview && (
            <div className="bg-sky-50/60 border border-sky-200/60 rounded-[16px] p-4 text-center">
              <p className="font-body text-sky-600 text-xs">
                📐 {preview.grid.cols} × {preview.grid.rows} grid
                &nbsp;·&nbsp;
                each piece ~{preview.pieceW} × {preview.pieceH}px
              </p>
            </div>
          )}

          <Button
            label="Analyse Puzzle →"
            onClick={handleStart}
            disabled={!canProceed}
            className="w-full"
          />
        </Card>

      </div>
    </AppShell>
  )
}