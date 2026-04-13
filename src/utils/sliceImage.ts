import type { PuzzlePiece, GridConfig } from '../types/puzzle'
import { spatialHistogramFromUrl, histogramConfigForCount } from './colorHistogram'

/**
 * Overlap fraction for reference slices.
 *
 * Real puzzle pieces include content from the boundary area due to
 * interlocking tabs/blanks. Adding 10% overlap to each side of
 * the reference crop captures this boundary content so the reference
 * embedding better represents what a camera photo of the actual piece
 * would contain.
 */
const OVERLAP_FRACTION = 0.10

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

      // Overlap in pixels (clamped so we never exceed image bounds)
      const overlapX = Math.round(pieceWidth  * OVERLAP_FRACTION)
      const overlapY = Math.round(pieceHeight * OVERLAP_FRACTION)

      const pieces: PuzzlePiece[] = []

      for (let row = 0; row < grid.rows; row++) {
        for (let col = 0; col < grid.cols; col++) {
          // Base position (no overlap)
          const baseX = col * pieceWidth
          const baseY = row * pieceHeight

          // Expanded crop region with overlap, clamped to image bounds
          const sx = Math.max(0, baseX - overlapX)
          const sy = Math.max(0, baseY - overlapY)
          const sx2 = Math.min(img.width,  baseX + pieceWidth  + overlapX)
          const sy2 = Math.min(img.height, baseY + pieceHeight + overlapY)
          const sw = sx2 - sx
          const sh = sy2 - sy

          const canvas = document.createElement('canvas')
          canvas.width  = sw
          canvas.height = sh
          const ctx = canvas.getContext('2d', { willReadFrequently: true })

          if (!ctx) continue

          ctx.drawImage(
            img,
            sx, sy, sw, sh,
            0, 0, sw, sh,
          )

          // Thumbnail for display uses the exact grid cell (no overlap)
          const thumbCanvas = document.createElement('canvas')
          thumbCanvas.width  = pieceWidth
          thumbCanvas.height = pieceHeight
          const thumbCtx = thumbCanvas.getContext('2d', { willReadFrequently: true })
          if (!thumbCtx) continue
          thumbCtx.drawImage(
            img,
            baseX, baseY, pieceWidth, pieceHeight,
            0, 0, pieceWidth, pieceHeight,
          )
          const imageDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.85)
          if (imageDataUrl === 'data:,') continue

          // Embedding is computed from the overlapped crop
          const embeddingDataUrl = canvas.toDataURL('image/jpeg', 0.92)
          const embedding = await spatialHistogramFromUrl(embeddingDataUrl, cfg)

          pieces.push({
            id: `${row}-${col}`,
            row, col,
            x: baseX,
            y: baseY,
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
