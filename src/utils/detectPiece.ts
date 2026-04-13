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

const LUMA_WHITE  = 210   // above → white paper
const LUMA_DARK   = 40    // below → dark background / shadow / dark desk
const SAMPLE_PX   = 120   // max dimension for detection canvas
const PAD_PX      = 10    // padding added around detected region (in sample coords)
const MIN_FILL    = 0.012 // minimum fraction of sample pixels to be "piece"
const MARGIN      = 0.10  // ignore outer 10% of frame on each side (desk edges live here)
const MAX_REGION  = 0.55  // if detected region > 55% of analysis area → reject (desk included)

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

  // Only analyse the centre 80% of the frame — desk/table edges live in the margins
  const mx  = Math.floor(sw * MARGIN)
  const my  = Math.floor(sh * MARGIN)
  const mxE = sw - mx
  const myE = sh - my

  let minX = mxE, maxX = mx - 1, minY = myE, maxY = my - 1, n = 0

  for (let py = my; py < myE; py++) {
    for (let px = mx; px < mxE; px++) {
      const i = (py * sw + px) * 4
      const r = data[i], g = data[i + 1], b = data[i + 2]
      const luma = (r * 299 + g * 587 + b * 114) / 1000
      if (luma > LUMA_WHITE || luma < LUMA_DARK) continue
      if (px < minX) minX = px
      if (px > maxX) maxX = px
      if (py < minY) minY = py
      if (py > maxY) maxY = py
      n++
    }
  }

  if (maxX < mx || n < sw * sh * MIN_FILL) return null

  const pw = maxX - minX + 1
  const ph = maxY - minY + 1

  // If the region fills most of the analysis area it is almost certainly
  // background contamination (wooden desk, shadow) — fall back to centre crop
  const aw = mxE - mx, ah = myE - my
  if (pw > aw * MAX_REGION || ph > ah * MAX_REGION) return null

  if (pw < sw * 0.04 || ph < sh * 0.04) return null

  // Convert back to video coordinates with padding
  const x  = Math.max(0,  (minX - PAD_PX) / scale)
  const y  = Math.max(0,  (minY - PAD_PX) / scale)
  const x2 = Math.min(vw, (maxX + PAD_PX) / scale)
  const y2 = Math.min(vh, (maxY + PAD_PX) / scale)

  return {
    x, y, w: x2 - x, h: y2 - y,
    confidence: Math.min(1, n / (sw * sh * 0.05)),
  }
}
