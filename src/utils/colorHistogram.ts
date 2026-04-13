/**
 * Enhanced per-zone feature extraction for puzzle piece matching.
 *
 * IMPROVEMENTS OVER v1:
 *  1. Higher histogram resolution (more zones, bins, resize px)
 *  2. Multi-scale histograms — computed at 3 zone resolutions and concatenated
 *     so both coarse layout and fine detail are captured.
 *  3. Per-zone color moments (mean/std of H, S, V) as complementary features
 *     — more robust to small hue shifts than histograms alone.
 *  4. LAB color space features alongside HSV — perceptually uniform and more
 *     robust to lighting variation; hue is notoriously unstable at low sat/val.
 *  5. Adaptive cropToContent using Otsu-style bimodal thresholding on the V
 *     channel instead of fixed thresholds — adapts to different paper colors
 *     and lighting conditions.
 *  6. Gray-world white-balance normalization on query images before feature
 *     extraction — reduces domain gap between camera photos and digital crops.
 *  7. Per-zone L2 normalization preserved from v1 to keep zone contributions
 *     balanced.
 *
 * The final embedding is a concatenation of:
 *   [multi-scale hue+gray histograms | per-zone color moments (HSV) | per-zone LAB moments]
 *
 * This gives much higher discriminative power than the v1 single-scale
 * hue histogram alone.
 */

const MIN_SAT  = 0.12  // below this → achromatic (hue unreliable)
const CROP_PAD = 6     // px padding kept around content when cropping

export interface HistogramConfig {
  zones: number       // primary NxN spatial grid (used for moments)
  hueBins: number     // hue buckets per zone
  grayBins: number    // brightness buckets per zone
  resize: number      // px to resize to before sampling
  scales: number[]    // multi-scale zone counts, e.g. [3, 5, 7]
  labBins: number     // bins per LAB channel per zone
}

/**
 * Scale histogram resolution to piece count.
 *
 * v2: significantly higher resolution at every tier + multi-scale + LAB.
 *
 *  ≤100  pieces → primary 6×6 zones, multi-scale [3,5,7], resize 96
 *  ≤250  pieces → primary 7×7 zones, multi-scale [3,5,8], resize 112
 *  ≤500  pieces → primary 8×8 zones, multi-scale [4,6,9], resize 128
 *  >500  pieces → primary 9×9 zones, multi-scale [4,7,10], resize 144
 */
export function histogramConfigForCount(pieceCount: number): HistogramConfig {
  if (pieceCount <= 100) return { zones: 6, hueBins: 16, grayBins: 6, resize: 96,  scales: [3, 5, 7], labBins: 8 }
  if (pieceCount <= 250) return { zones: 7, hueBins: 18, grayBins: 6, resize: 112, scales: [3, 5, 8], labBins: 10 }
  if (pieceCount <= 500) return { zones: 8, hueBins: 20, grayBins: 6, resize: 128, scales: [4, 6, 9], labBins: 10 }
  return                        { zones: 9, hueBins: 24, grayBins: 8, resize: 144, scales: [4, 7, 10], labBins: 12 }
}

const DEFAULT_CONFIG: HistogramConfig = histogramConfigForCount(100)

// ─── color space conversions ─────────────────────────────────────────────────

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

/**
 * Convert sRGB to CIE LAB (D65 illuminant).
 * Returns L in [0,100], a in ~[-128,127], b in ~[-128,127].
 * We normalize to [0,1] ranges for embedding use.
 */
function rgbToLab(r: number, g: number, b: number): [number, number, number] {
  // sRGB → linear RGB
  let rl = r / 255, gl = g / 255, bl = b / 255
  rl = rl > 0.04045 ? Math.pow((rl + 0.055) / 1.055, 2.4) : rl / 12.92
  gl = gl > 0.04045 ? Math.pow((gl + 0.055) / 1.055, 2.4) : gl / 12.92
  bl = bl > 0.04045 ? Math.pow((bl + 0.055) / 1.055, 2.4) : bl / 12.92

  // linear RGB → XYZ (D65)
  let x = (rl * 0.4124564 + gl * 0.3575761 + bl * 0.1804375) / 0.95047
  let y = (rl * 0.2126729 + gl * 0.7151522 + bl * 0.0721750) / 1.00000
  let z = (rl * 0.0193339 + gl * 0.1191920 + bl * 0.9503041) / 1.08883

  const f = (t: number) => t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116
  const fx = f(x), fy = f(y), fz = f(z)

  const L = (116 * fy - 16) / 100         // normalize to [0, 1]
  const a = (500 * (fx - fy) + 128) / 256  // normalize to ~[0, 1]
  const bVal = (200 * (fy - fz) + 128) / 256

  return [L, a, bVal]
}

// ─── normalization helpers ───────────────────────────────────────────────────

function l2Normalize(arr: Float32Array, start: number, len: number): void {
  let norm = 0
  for (let i = start; i < start + len; i++) norm += arr[i] * arr[i]
  if (norm === 0) return
  norm = Math.sqrt(norm)
  for (let i = start; i < start + len; i++) arr[i] /= norm
}

function l2NormalizeSlice(arr: number[], start: number, len: number): void {
  let norm = 0
  for (let i = start; i < start + len; i++) norm += arr[i] * arr[i]
  if (norm === 0) return
  norm = Math.sqrt(norm)
  for (let i = start; i < start + len; i++) arr[i] /= norm
}

// ─── white-balance normalization (gray world) ────────────────────────────────

/**
 * Apply gray-world white-balance correction to canvas image data.
 * Scales each channel so its mean equals the global average,
 * reducing color cast from lighting.
 */
export function applyGrayWorldWB(data: Uint8ClampedArray, width: number, height: number): void {
  const n = width * height
  if (n === 0) return

  let sumR = 0, sumG = 0, sumB = 0
  for (let i = 0; i < data.length; i += 4) {
    sumR += data[i]
    sumG += data[i + 1]
    sumB += data[i + 2]
  }

  const avgR = sumR / n
  const avgG = sumG / n
  const avgB = sumB / n
  const avgAll = (avgR + avgG + avgB) / 3

  if (avgR === 0 || avgG === 0 || avgB === 0) return

  const scaleR = avgAll / avgR
  const scaleG = avgAll / avgG
  const scaleB = avgAll / avgB

  for (let i = 0; i < data.length; i += 4) {
    data[i]     = Math.min(255, Math.round(data[i] * scaleR))
    data[i + 1] = Math.min(255, Math.round(data[i + 1] * scaleG))
    data[i + 2] = Math.min(255, Math.round(data[i + 2] * scaleB))
  }
}

// ─── adaptive crop (Otsu-style) ──────────────────────────────────────────────

/**
 * Compute Otsu threshold on an array of brightness values [0..255].
 * Returns the optimal threshold that minimizes intra-class variance.
 */
function otsuThreshold(values: number[]): number {
  const hist = new Int32Array(256)
  for (const v of values) hist[Math.min(255, Math.max(0, Math.round(v)))]++

  const total = values.length
  if (total === 0) return 128

  let sumAll = 0
  for (let i = 0; i < 256; i++) sumAll += i * hist[i]

  let sumBg = 0, wBg = 0
  let bestThresh = 0, bestVar = -1

  for (let t = 0; t < 256; t++) {
    wBg += hist[t]
    if (wBg === 0) continue
    const wFg = total - wBg
    if (wFg === 0) break

    sumBg += t * hist[t]
    const meanBg = sumBg / wBg
    const meanFg = (sumAll - sumBg) / wFg
    const varBetween = wBg * wFg * (meanBg - meanFg) * (meanBg - meanFg)

    if (varBetween > bestVar) {
      bestVar = varBetween
      bestThresh = t
    }
  }

  return bestThresh
}

/**
 * Crop a canvas to the bounding box of its puzzle-piece pixels.
 *
 * v2: Uses adaptive Otsu-style thresholding on the V channel to
 * determine what is "background" vs "content". This adapts to
 * different paper colors, lighting conditions, and desk surfaces.
 *
 * Falls back to fixed thresholds if Otsu gives an unreasonable result.
 */
export function cropToContent(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!
  const { width, height } = canvas
  const imgData = ctx.getImageData(0, 0, width, height)
  const { data } = imgData

  // Collect brightness values for Otsu thresholding
  const brightnessValues: number[] = []
  for (let i = 0; i < data.length; i += 4) {
    const [, , v] = rgbToHsv(data[i], data[i + 1], data[i + 2])
    brightnessValues.push(v * 255)
  }

  const otsu = otsuThreshold(brightnessValues)

  // Use Otsu threshold but clamp to reasonable range
  // If Otsu gives something extreme, fall back to sensible defaults
  const darkThresh = Math.min(otsu * 0.4, 50) / 255   // dynamic dark cutoff
  const brightThresh = Math.max(otsu + (255 - otsu) * 0.6, 200) / 255 // dynamic bright cutoff

  let minX = width, maxX = 0, minY = height, maxY = 0

  for (let py = 0; py < height; py++) {
    for (let px = 0; px < width; px++) {
      const i = (py * width + px) * 4
      const [, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2])
      // Content: not too dark, not too bright, and either saturated or mid-brightness
      if (v > darkThresh && v < brightThresh && (s >= MIN_SAT || (v > 0.15 && v < 0.75))) {
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
  if (contentW > width * 0.85 && contentH > height * 0.85) return canvas

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

// ─── feature extraction: single-scale histogram ─────────────────────────────

/**
 * Build a per-zone hue+gray histogram at a given zone count.
 * Returns a Float32Array with per-zone L2-normalized bins.
 */
function buildHistogramAtScale(
  data: Uint8ClampedArray,
  resize: number,
  zoneCount: number,
  hueBins: number,
  grayBins: number,
  minV: number,
  maxV: number,
): Float32Array {
  const perZone = hueBins + grayBins
  const out = new Float32Array(zoneCount * zoneCount * perZone)
  const zonePixels = resize / zoneCount

  for (let py = 0; py < resize; py++) {
    for (let px = 0; px < resize; px++) {
      const i = (py * resize + px) * 4
      const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2])

      if (v > maxV || v < minV) continue

      const zx   = Math.min(Math.floor(px / zonePixels), zoneCount - 1)
      const zy   = Math.min(Math.floor(py / zonePixels), zoneCount - 1)
      const z    = zy * zoneCount + zx
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

  // L2 normalize each zone's hue bins and gray bins independently
  for (let z = 0; z < zoneCount * zoneCount; z++) {
    const base = z * perZone
    l2Normalize(out, base,           hueBins)
    l2Normalize(out, base + hueBins, grayBins)
  }

  return out
}

// ─── feature extraction: color moments ───────────────────────────────────────

/**
 * Compute per-zone color moments: mean and std of H, S, V channels.
 * Returns 6 floats per zone (meanH, stdH, meanS, stdS, meanV, stdV),
 * each zone L2-normalized.
 */
function buildColorMoments(
  data: Uint8ClampedArray,
  resize: number,
  zoneCount: number,
  minV: number,
  maxV: number,
): number[] {
  const FEATURES_PER_ZONE = 6 // meanH, stdH, meanS, stdS, meanV, stdV
  const totalZones = zoneCount * zoneCount
  const zonePixels = resize / zoneCount

  // Accumulators per zone
  const sumH = new Float64Array(totalZones)
  const sumS = new Float64Array(totalZones)
  const sumV = new Float64Array(totalZones)
  const sumH2 = new Float64Array(totalZones)
  const sumS2 = new Float64Array(totalZones)
  const sumV2 = new Float64Array(totalZones)
  const counts = new Int32Array(totalZones)

  for (let py = 0; py < resize; py++) {
    for (let px = 0; px < resize; px++) {
      const i = (py * resize + px) * 4
      const [h, s, v] = rgbToHsv(data[i], data[i + 1], data[i + 2])
      if (v > maxV || v < minV) continue

      const zx = Math.min(Math.floor(px / zonePixels), zoneCount - 1)
      const zy = Math.min(Math.floor(py / zonePixels), zoneCount - 1)
      const z  = zy * zoneCount + zx

      sumH[z] += h;  sumH2[z] += h * h
      sumS[z] += s;  sumS2[z] += s * s
      sumV[z] += v;  sumV2[z] += v * v
      counts[z]++
    }
  }

  const out: number[] = new Array(totalZones * FEATURES_PER_ZONE).fill(0)

  for (let z = 0; z < totalZones; z++) {
    const n = counts[z]
    if (n < 2) continue
    const base = z * FEATURES_PER_ZONE
    out[base]     = sumH[z] / n                                          // meanH
    out[base + 1] = Math.sqrt(Math.max(0, sumH2[z] / n - (sumH[z] / n) ** 2)) // stdH
    out[base + 2] = sumS[z] / n                                          // meanS
    out[base + 3] = Math.sqrt(Math.max(0, sumS2[z] / n - (sumS[z] / n) ** 2)) // stdS
    out[base + 4] = sumV[z] / n                                          // meanV
    out[base + 5] = Math.sqrt(Math.max(0, sumV2[z] / n - (sumV[z] / n) ** 2)) // stdV
  }

  // L2 normalize each zone's moment vector
  for (let z = 0; z < totalZones; z++) {
    l2NormalizeSlice(out, z * FEATURES_PER_ZONE, FEATURES_PER_ZONE)
  }

  return out
}

// ─── feature extraction: LAB moments ─────────────────────────────────────────

/**
 * Compute per-zone LAB color moments: mean and std of L, a, b channels.
 * LAB is perceptually uniform — better at capturing perceived color
 * differences, and more robust to lighting changes than HSV.
 */
function buildLabMoments(
  data: Uint8ClampedArray,
  resize: number,
  zoneCount: number,
  minV: number,
  maxV: number,
): number[] {
  const FEATURES_PER_ZONE = 6 // meanL, stdL, meanA, stdA, meanB, stdB
  const totalZones = zoneCount * zoneCount
  const zonePixels = resize / zoneCount

  const sumL = new Float64Array(totalZones)
  const sumA = new Float64Array(totalZones)
  const sumB = new Float64Array(totalZones)
  const sumL2 = new Float64Array(totalZones)
  const sumA2 = new Float64Array(totalZones)
  const sumB2 = new Float64Array(totalZones)
  const counts = new Int32Array(totalZones)

  for (let py = 0; py < resize; py++) {
    for (let px = 0; px < resize; px++) {
      const i = (py * resize + px) * 4
      // Check brightness with HSV to decide whether to skip pixel
      const [, , v] = rgbToHsv(data[i], data[i + 1], data[i + 2])
      if (v > maxV || v < minV) continue

      const [L, a, b] = rgbToLab(data[i], data[i + 1], data[i + 2])

      const zx = Math.min(Math.floor(px / zonePixels), zoneCount - 1)
      const zy = Math.min(Math.floor(py / zonePixels), zoneCount - 1)
      const z  = zy * zoneCount + zx

      sumL[z] += L;  sumL2[z] += L * L
      sumA[z] += a;  sumA2[z] += a * a
      sumB[z] += b;  sumB2[z] += b * b
      counts[z]++
    }
  }

  const out: number[] = new Array(totalZones * FEATURES_PER_ZONE).fill(0)

  for (let z = 0; z < totalZones; z++) {
    const n = counts[z]
    if (n < 2) continue
    const base = z * FEATURES_PER_ZONE
    out[base]     = sumL[z] / n
    out[base + 1] = Math.sqrt(Math.max(0, sumL2[z] / n - (sumL[z] / n) ** 2))
    out[base + 2] = sumA[z] / n
    out[base + 3] = Math.sqrt(Math.max(0, sumA2[z] / n - (sumA[z] / n) ** 2))
    out[base + 4] = sumB[z] / n
    out[base + 5] = Math.sqrt(Math.max(0, sumB2[z] / n - (sumB[z] / n) ** 2))
  }

  // L2 normalize each zone
  for (let z = 0; z < totalZones; z++) {
    l2NormalizeSlice(out, z * FEATURES_PER_ZONE, FEATURES_PER_ZONE)
  }

  return out
}

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Build the complete multi-feature embedding from a canvas.
 *
 * The embedding is a concatenation of:
 *  1. Multi-scale hue+gray histograms (at each scale in cfg.scales)
 *  2. Per-zone HSV color moments (at primary zone count)
 *  3. Per-zone LAB color moments (at primary zone count)
 *
 * Pixel skip thresholds (minV, maxV) are determined adaptively from the image.
 */
export function buildZoneHistogram(
  canvas: HTMLCanvasElement,
  cfg: HistogramConfig = DEFAULT_CONFIG,
): number[] {
  const { zones, hueBins, grayBins, resize, scales } = cfg

  // Resize to working resolution
  const small = document.createElement('canvas')
  small.width  = resize
  small.height = resize
  const sc = small.getContext('2d', { willReadFrequently: true })!
  sc.drawImage(canvas, 0, 0, resize, resize)
  const imgData = sc.getImageData(0, 0, resize, resize)
  const { data } = imgData

  // Determine adaptive brightness thresholds from this image
  const brightnessValues: number[] = []
  for (let i = 0; i < data.length; i += 4) {
    const [, , v] = rgbToHsv(data[i], data[i + 1], data[i + 2])
    brightnessValues.push(v)
  }
  brightnessValues.sort((a, b) => a - b)
  const p5  = brightnessValues[Math.floor(brightnessValues.length * 0.05)] ?? 0
  const p95 = brightnessValues[Math.floor(brightnessValues.length * 0.95)] ?? 1
  // Adaptive thresholds: skip the darkest 5% and brightest 5% of pixels
  // but clamp to reasonable defaults
  const minV = Math.max(0.05, Math.min(0.15, p5 + 0.02))
  const maxV = Math.min(0.95, Math.max(0.80, p95 - 0.02))

  // 1. Multi-scale histograms
  const histParts: number[] = []
  for (const s of scales) {
    const hist = buildHistogramAtScale(data, resize, s, hueBins, grayBins, minV, maxV)
    histParts.push(...Array.from(hist))
  }

  // 2. HSV color moments at primary zone count
  const hsvMoments = buildColorMoments(data, resize, zones, minV, maxV)

  // 3. LAB color moments at primary zone count
  const labMoments = buildLabMoments(data, resize, zones, minV, maxV)

  // Concatenate all features
  return [...histParts, ...hsvMoments, ...labMoments]
}

/**
 * For reference pieces (clean rectangular crops) — no preprocessing needed.
 */
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

/**
 * For query pieces (photos of physical pieces):
 *  1. Apply gray-world white-balance correction
 *  2. Crop background using adaptive thresholding
 *  3. Compute the full multi-feature embedding
 */
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

      // Apply gray-world white-balance correction to reduce lighting color cast
      const imgData = ctx.getImageData(0, 0, img.width, img.height)
      applyGrayWorldWB(imgData.data, img.width, img.height)
      ctx.putImageData(imgData, 0, 0)

      // Crop to piece content using adaptive thresholding
      const cropped = cropToContent(canvas)
      resolve(buildZoneHistogram(cropped, cfg))
    }
    img.src = url
  })
}
