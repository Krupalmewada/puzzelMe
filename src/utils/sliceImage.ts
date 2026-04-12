import type { PuzzlePiece, GridConfig } from '../types/puzzle'
import { spatialHistogramFromUrl, histogramConfigForCount } from './colorHistogram'

export async function sliceImage(
  imageUrl: string,
  grid: GridConfig,
  pieceCount: number,
): Promise<PuzzlePiece[]> {
  return new Promise((resolve) => {
    const img = new Image()
    const cfg = histogramConfigForCount(pieceCount)

    img.onload = async () => {
      const pieceWidth  = Math.floor(img.width  / grid.cols)
      const pieceHeight = Math.floor(img.height / grid.rows)

      if (img.width === 0 || img.height === 0) {
        console.error('Image has zero dimensions!')
        return
      }

      if (pieceWidth < 10 || pieceHeight < 10) {
        console.error('Pieces are too small — increase image size or reduce piece count')
        return
      }

      const pieces: PuzzlePiece[] = []

      for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
          const canvas = document.createElement('canvas')
          canvas.width  = pieceWidth
          canvas.height = pieceHeight
          const ctx = canvas.getContext('2d', { willReadFrequently: true })

          if (!ctx) continue

          ctx.drawImage(
            img,
            col * pieceWidth, row * pieceHeight, pieceWidth, pieceHeight,
            0, 0, pieceWidth, pieceHeight,
          )

          const imageDataUrl = canvas.toDataURL('image/jpeg', 0.85)
          if (imageDataUrl === 'data:,') continue

          const embedding = await spatialHistogramFromUrl(imageDataUrl, cfg)

          pieces.push({
            id: `${row}-${col}`,
            row, col,
            x: col * pieceWidth,
            y: row * pieceHeight,
            width: pieceWidth,
            height: pieceHeight,
            imageDataUrl,
            embedding,
          })
        }
      }

      resolve(pieces)
    }

    img.onerror = (e) => console.error('Image failed to load!', e)
    img.src = imageUrl
  })
}
