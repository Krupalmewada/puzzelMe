/**
 * Per-zone L2-normalized hue histogram for puzzle piece matching.
 *
 * WHY NOT PIXEL GRID + COSINE:
 * Cosine similarity on dense pixel vectors fails here because every piece
 * from the same source image has similar global value statistics — scores
 * all cluster around ~0.93 regardless of visual content.
 *
 * THE FIX — two key ideas:
 *  1. Normalize EACH ZONE independently (L2) before comparing.
 *     Each zone contributes an equal [-1, 1] slice to the dot product,
 *     so two pieces with different zone patterns score differently even if
 *     their global stats are identical.
 *  2. Use HUE histograms (not raw pixel values).
 *     Hue is invariant to brightness changes between a photo and a render,
 *     and histograms within a zone are robust to small crop shifts.
 *
 * WHY NO GRADIENT BINS:
 *  JPEG compression creates spurious block-boundary edges in camera photos
 *  but not in clean reference crops. Gradient histograms look systematically
 *  different between photo and reference, adding noise that overwhelms the
 *  color signal.
 *
 * WHY SKIP WHITE AND DARK PIXELS IN HISTOGRAM:
 *  After cropToContent removes the outer white border, the concave areas of
 *  the puzzle-piece shape still contain white paper. Those V≈1.0 pixels fall
 *  into the highest gray bin and skew zone data. Reference crops don't have
 *  this. Skipping extreme-brightness pixels from both ends makes query and
 *  reference comparable.
 *
 * Query piece preprocessing:
 *  Photos of physical pieces have a white/background border outside the
 *  irregular piece shape. cropToContent() removes this border before
 *  computing the histogram so background pixels don't skew zone data.
 *  Reference crops are rectangular so they skip this step.
 *
 * Scaling for larger puzzles:
 *  More pieces = smaller, more similar pieces = need finer discrimination.
 *  histogramConfigForCount() returns appropriate zones/bins per piece count.
 */

const MIN_SAT  = 0.12  // below this → achromatic (hue unreliable)
const MIN_V    = 0.08  // below this → too dark / shadowed desk
const MAX_V    = 0.92  // above this → white paper background
const CROP_PAD = 4     // px padding kept around content when cropping

export interface HistogramConfig {
  zones: number    // NxN spatial grid
  hueBins: number  // hue buckets per zone
  grayBins: number // brightness buckets per zone
  resize: number   // px to resize to before sampling
}

/**
 * Scale histogram resolution to piece count.
 *
 *  ≤100  pieces → 4×4 zones, 12 hue bins  (256 floats)
 *  ≤250  pieces → 5×5 zones, 14 hue bins  (450 floats)
 *  ≤500  pieces → 6×6 zones, 16 hue bins  (720 floats)
 *  >500  pieces → 7×7 zones, 20 hue bins  (1127 floats)
 */
export function histogramConfigForCount(pieceCount: number): HistogramConfig {
  if (pieceCount <= 100) return { zones: 4, hueBins: 12, grayBins: 4, resize: 48 }
  if (pieceCount <= 250) return { zones: 5, hueBins: 14, grayBins: 4, resize: 60 }
  if (pieceCount <= 500) return { zones: 6, hueBins: 16, grayBins: 4, resize: 72 }
  return                        { zones: 7, hueBins: 20, grayBins: 4, resize: 84 }
}

const DEFAULT_CONFIG: HistogramConfig = histogramConfigForCount(100)

// ─── internals ───────────────────────────────────────────────────────────────

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const rn = r / 255, gn = g / 255, bn = b / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  const v = max
  const s = max === 0 ? 0 : delta / max
  let h = 0
  if (delta > 0) {
    if (max === rn) h = (((gn - bn) / delta) % 6 + 6) % 6 / 6
    else if (max === gn) h = ((bn - rn) / delta + 2) / 6
    else h = ((rn - gn) / delta + 4) / 6
  }
  return [h, s, v]
}

function l2Normalize(arr: Float32Array, start: number, len: number): void {
  let norm = 0
  for (let i = start; i < start + len; i++) norm += arr[i] * arr[i]
  if (norm === 0) return
  norm = Math.sqrt(norm)
  for (let i = start; i < start + len; i++) arr[i] /= norm
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Crop a canvas to the bounding box of its puzzle-piece pixels.
 *
 * "Content" = coloured AND mid-brightness:
 *   - Excludes white/light backgrounds (paper): V > 0.88
 *   - Excludes dark backgrounds (desk, shadows): V < 0.10
 *   - Excludes near-gray pixels: S < MIN_SAT
 *
 * The old saturation-only check let dark wooden desks pass (S~0.2-0.3)
 * which expanded the bounding box to nearly the full frame, defeating
 * the crop entirely.
 */
export function cropToContent(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const { width, height } = canvas
  const { data } = ctx.getImageData(0, 0, width, height)

  let minX = width, maxX = 0, minY = height, maxY = 0

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const i = (py * width + px) * 4
      const [, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2])
      // Skip white/bright backgrounds, dark desk surfaces, and near-grays
      if (s >= MIN_SAT && v > 0.10 && v < 0.88) {
        if (px < minX) minX = px
        if (px > maxX) maxX = px
        if (py < minY) minY = py
        if (py > maxY) maxY = py
      }
    }
  }

  const contentW = maxX - minX
  const contentH = maxY - minY
  if (contentW <= 0 || contentH <= 0) return canvas
  if (contentW > width * 0.8 && contentH > height * 0.8) return canvas

  const cx = Math.max(0, minX - CROP_PAD)
  const cy = Math.max(0, minY - CROP_PAD)
  const cw = Math.min(width,  maxX + CROP_PAD) - cx
  const ch = Math.min(height, maxY + CROP_PAD) - cy

  const out = document.createElement('canvas')
  out.width  = cw
  out.height = ch
  out.getContext('2d')!.drawImage(canvas, cx, cy, cw, ch, 0, 0, cw, ch)
  return out
}

/** Build the zone histogram feature vector from a canvas. */
export function buildZoneHistogram(
  canvas: HTMLCanvasElement,
  cfg: HistogramConfig = DEFAULT_CONFIG,
): number[] {
  const { zones, hueBins, grayBins, resize } = cfg

  const small = document.createElement('canvas')
  small.width  = resize
  small.height = resize
  const sc = small.getContext('2d', { willReadFrequently: true })!
  sc.drawImage(canvas, 0, 0, resize, resize)
  const { data } = sc.getImageData(0, 0, resize, resize)

  const perZone    = hueBins + grayBins
  const out        = new Float32Array(zones * zones * perZone)
  const zonePixels = resize / zones

  for (let py = 0; py < resize; py++) {
    for (let px = 0; px < resize; px++) {
      const i = (py * resize + px) * 4
      const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2])

      // Skip white paper background (including concave areas of piece shape)
      // and very dark pixels (shadows, dark desk) — they skew zone data and
      // look different between a camera photo and a clean reference crop.
      if (v > MAX_V || v < MIN_V) continue

      const zx   = Math.min(Math.floor(px / zonePixels), zones - 1)
      const zy   = Math.min(Math.floor(py / zonePixels), zones - 1)
      const z    = zy * zones + zx
      const base = z * perZone

      if (s >= MIN_SAT) {
        const bin = Math.min(Math.floor(h * hueBins), hueBins - 1)
        out[base + bin]++
      } else {
        const bin = Math.min(Math.floor(v * grayBins), grayBins - 1)
        out[base + hueBins + bin]++
      }
    }
  }

  for (let z = 0; z < zones * zones; z++) {
    const base = z * perZone
    l2Normalize(out, base,           hueBins)
    l2Normalize(out, base + hueBins, grayBins)
  }

  return Array.from(out)
}

/** For reference pieces (clean rectangular crops) — no preprocessing needed. */
export function spatialHistogramFromUrl(
  url: string,
  cfg: HistogramConfig = DEFAULT_CONFIG,
): Promise<number[]> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0)
      resolve(buildZoneHistogram(canvas, cfg))
    }
    img.src = url
  })
}

/** For query pieces (photos of physical pieces) — crop background first. */
export function queryHistogramFromUrl(
  url: string,
  cfg: HistogramConfig = DEFAULT_CONFIG,
): Promise<number[]> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0)
      const cropped = cropToContent(canvas)
      resolve(buildZoneHistogram(cropped, cfg))
    }
    img.src = url
  })
}
