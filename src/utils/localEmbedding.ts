import * as mobilenet from '@tensorflow-models/mobilenet'
import * as tf from '@tensorflow/tfjs'

let model: mobilenet.MobileNet | null = null
let loadPromise: Promise<mobilenet.MobileNet> | null = null

export async function getModel(): Promise<mobilenet.MobileNet> {
  if (model) return model
  if (loadPromise) return loadPromise

  loadPromise = mobilenet.load({ version: 2, alpha: 1.0 }).then((m) => {
    model = m
    return m
  })
  return loadPromise
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = dataUrl
  })
}

/**
 * Extract a 1280-dim visual embedding from MobileNetV2's penultimate layer.
 * Runs entirely in the browser — no API calls, no rate limits.
 */
export async function getLocalEmbedding(imageDataUrl: string): Promise<number[]> {
  const net = await getModel()
  const img = await loadImage(imageDataUrl)

  // infer(img, true) = skip the final classification layer, return feature vector
  const embedding = net.infer(img, true) as tf.Tensor
  const data = await embedding.data()
  embedding.dispose()

  return Array.from(data)
}

/** Call this early (e.g. on app start) to warm up the model download. */
export function preloadModel(): void {
  getModel().catch(() => {})
}
