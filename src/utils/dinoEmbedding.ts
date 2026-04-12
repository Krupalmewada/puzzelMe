const HF_TOKEN = import.meta.env.VITE_HF_TOKEN
const MODEL_URL = '/hf-api/models/openai/clip-vit-base-patch32'

export async function getDinoEmbedding(imageDataUrl: string): Promise<number[]> {
  const base64 = imageDataUrl.split(',')[1]
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  const blob = new Blob([bytes], { type: 'image/png' })

  const response = await fetch(MODEL_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${HF_TOKEN}`,
      'Content-Type': 'application/octet-stream',
    },
    body: blob,
  })

  if (response.status === 503) {
    // model is loading — wait and retry once
    await new Promise(r => setTimeout(r, 10000))
    return getDinoEmbedding(imageDataUrl)
  }

  if (!response.ok) {
    throw new Error(`HF API error: ${response.status} ${response.statusText}`)
  }

  const result = await response.json()

  // CLIP returns nested array — flatten to 1D vector
  if (Array.isArray(result) && Array.isArray(result[0])) {
    return result[0] as number[]
  }
  if (Array.isArray(result)) {
    return result as number[]
  }

  throw new Error(`Unexpected response format: ${JSON.stringify(result)}`)
}