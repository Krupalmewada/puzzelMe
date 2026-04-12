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
 * Layout (per zone):
 *   [hue_bins × HUE_BINS (L2-normalized)] ++ [bright_bins × GRAY_BINS (L2-normalized)]
 *
 * Zones: 4×4 = 16
 * Per zone: 12 hue bins + 4 brightness bins = 16 floats
 * Total: 256 floats
 */

const ZONES     = 4    // 4×4 spatial grid = 16 zones
const HUE_BINS  = 12   // 30° per bucket, hue-circular
const GRAY_BINS = 4    // brightness buckets for near-achromatic regions
const MIN_SAT   = 0.12 // below this → achromatic (hue unreliable)
const RESIZE    = 48   // 48×48px → 12×12 pixels per zone

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

export function buildZoneHistogram(canvas: HTMLCanvasElement): number[] {
  const small = document.createElement('canvas')
  small.width = RESIZE
  small.height = RESIZE
  const sc = small.getContext('2d', { willReadFrequently: true })!
  sc.drawImage(canvas, 0, 0, RESIZE, RESIZE)
  const { data } = sc.getImageData(0, 0, RESIZE, RESIZE)

  const perZone = HUE_BINS + GRAY_BINS
  const out = new Float32Array(ZONES * ZONES * perZone)

  const zonePixels = RESIZE / ZONES  // pixels per zone side (= 12)

  for (let py = 0; py < RESIZE; py++) {
    for (let px = 0; px < RESIZE; px++) {
      const i = (py * RESIZE + px) * 4
      const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2])

      const zx = Math.min(Math.floor(px / zonePixels), ZONES - 1)
      const zy = Math.min(Math.floor(py / zonePixels), ZONES - 1)
      const z  = zy * ZONES + zx
      const base = z * perZone

      if (s >= MIN_SAT) {
        // Coloured pixel → hue bin
        const bin = Math.min(Math.floor(h * HUE_BINS), HUE_BINS - 1)
        out[base + bin]++
      } else {
        // Near-gray/white pixel → brightness bin
        const bin = Math.min(Math.floor(v * GRAY_BINS), GRAY_BINS - 1)
        out[base + HUE_BINS + bin]++
      }
    }
  }

  // L2-normalise each zone's hue block and gray block independently.
  // This makes each zone contribute equally to the final cosine score
  // regardless of how many colored vs gray pixels it has.
  for (let z = 0; z < ZONES * ZONES; z++) {
    const base = z * perZone
    l2Normalize(out, base,             HUE_BINS)   // hue block
    l2Normalize(out, base + HUE_BINS,  GRAY_BINS)  // gray block
  }

  return Array.from(out)
}

export function spatialHistogramFromUrl(url: string): Promise<number[]> {
  return new Promise((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width  = img.width
      canvas.height = img.height
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!
      ctx.drawImage(img, 0, 0)
      resolve(buildZoneHistogram(canvas))
    }
    img.src = url
  })
}
