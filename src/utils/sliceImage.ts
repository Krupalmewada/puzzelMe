import type { PuzzlePiece, GridConfig } from '../types/puzzle'
import { spatialHistogramFromUrl } from './colorHistogram'

export async function sliceImage(
  imageUrl: string,
  grid: GridConfig
): Promise<PuzzlePiece[]> {
  return new Promise((resolve) => {
    const img = new Image()

    img.onload = async () => {
      console.log('=== SLICE DEBUG ===')
      console.log('Image size:', img.width, 'x', img.height)
      console.log('Grid:', grid.cols, 'cols x', grid.rows, 'rows')

      const pieceWidth = Math.floor(img.width / grid.cols)
      const pieceHeight = Math.floor(img.height / grid.rows)

      console.log('Piece size:', pieceWidth, 'x', pieceHeight)
      console.log('Total pieces:', grid.cols * grid.rows)

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
          canvas.width = pieceWidth
          canvas.height = pieceHeight
          const ctx = canvas.getContext('2d', { willReadFrequently: true })

          if (!ctx) {
            console.error('Canvas context failed at', row, col)
            continue
          }

          ctx.drawImage(
            img,
            col * pieceWidth,
            row * pieceHeight,
            pieceWidth,
            pieceHeight,
            0, 0,
            pieceWidth,
            pieceHeight
          )

          // debug — log first piece pixel color
          if (row === 0 && col === 0) {
            const pixel = ctx.getImageData(0, 0, 1, 1).data
            console.log('First piece top-left pixel RGB:', pixel[0], pixel[1], pixel[2])
          }

          const imageDataUrl = canvas.toDataURL('image/png')
          // check data url is valid
          if (imageDataUrl === 'data:,') {
            console.error('Empty canvas at piece', row, col)
            continue
          }

          const embedding = await spatialHistogramFromUrl(imageDataUrl)

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

      console.log('Total pieces sliced:', pieces.length)
      console.log('First piece dataUrl length:', pieces[0]?.imageDataUrl?.length)
      console.log('=== END SLICE DEBUG ===')

      resolve(pieces)
    }

    img.onerror = (e) => {
      console.error('Image failed to load!', e)
    }

    img.src = imageUrl
  })
}