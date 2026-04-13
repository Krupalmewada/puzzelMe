/**
 * Detect the bounding region of a puzzle piece on white paper.
 *
 * Uses luminance thresholding at low resolution (~120px) for speed.
 * Returns coordinates in video pixel space with padding.
 */

export interface PieceRegion {
  x: number        // video pixel coordinates
  y: number
  w: number
  h: number
  confidence: number  // 0–1 (how much of the frame is piece content)
}

const LUMA_WHITE = 215   // above → white paper
const LUMA_DARK  = 25    // below → dark background / shadow
const SAMPLE_PX  = 120   // max dimension for detection canvas
const PAD_PX     = 14    // padding added around detected region (in sample coords)
const MIN_FILL   = 0.012 // minimum fraction of sample pixels to be "piece"

export function detectPieceRegion(video: HTMLVideoElement): PieceRegion | null {
  const vw = video.videoWidth
  const vh = video.videoHeight
  if (!vw || !vh) return null

  const scale = Math.min(SAMPLE_PX / vw, SAMPLE_PX / vh)
  const sw = Math.round(vw * scale)
  const sh = Math.round(vh * scale)

  const c = document.createElement('canvas')
  c.width = sw
  c.height = sh
  const ctx = c.getContext('2d', { willReadFrequently: true })!
  ctx.drawImage(video, 0, 0, sw, sh)
  const { data } = ctx.getImageData(0, 0, sw, sh)

  let minX = sw, maxX = -1, minY = sh, maxY = -1, n = 0

  for (let i = 0; i < sw * sh; i++) {
    const r = data[i * 4], g = data[i * 4 + 1], b = data[i * 4 + 2]
    const luma = (r * 299 + g * 587 + b * 114) / 1000
    if (luma > LUMA_WHITE || luma < LUMA_DARK) continue
    const px = i % sw
    const py = Math.floor(i / sw)
    if (px < minX) minX = px
    if (px > maxX) maxX = px
    if (py < minY) minY = py
    if (py > maxY) maxY = py
    n++
  }

  if (maxX < 0 || n < sw * sh * MIN_FILL) return null

  const pw = maxX - minX + 1
  const ph = maxY - minY + 1
  if (pw < sw * 0.05 || ph < sh * 0.05) return null

  // Convert back to video coordinates with padding
  const x  = Math.max(0,  (minX - PAD_PX) / scale)
  const y  = Math.max(0,  (minY - PAD_PX) / scale)
  const x2 = Math.min(vw, (maxX + PAD_PX) / scale)
  const y2 = Math.min(vh, (maxY + PAD_PX) / scale)

  return {
    x, y, w: x2 - x, h: y2 - y,
    confidence: Math.min(1, n / (sw * sh * 0.06)),
  }
}
