const WHITE_TOLERANCE = 50

function isWhite(r: number, g: number, b: number): boolean {
  return r > 255 - WHITE_TOLERANCE &&
         g > 255 - WHITE_TOLERANCE &&
         b > 255 - WHITE_TOLERANCE
}

export function getPixelVector(canvas: HTMLCanvasElement): number[] {
  const SIZE = 16
  const small = document.createElement('canvas')
  small.width = SIZE
  small.height = SIZE
  const ctx = small.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(canvas, 0, 0, SIZE, SIZE)
  const data = ctx.getImageData(0, 0, SIZE, SIZE).data

  const result: number[] = []

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i], g = data[i+1], b = data[i+2]
    if (isWhite(r, g, b)) {
      result.push(0, 0, 0)
    } else {
      result.push(r / 255, g / 255, b / 255)
    }
  }

  return result
}

export function pixelVectorFromUrl(url: string): Promise<number[]> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0)
      resolve(getPixelVector(canvas))
    }
    img.src = url
  })
}

export function getSpatialHistogram(canvas: HTMLCanvasElement): number[] {
  return getPixelVector(canvas)
}

export function spatialHistogramFromUrl(url: string): Promise<number[]> {
  return pixelVectorFromUrl(url)
}