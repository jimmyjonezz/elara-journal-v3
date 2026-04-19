export class VoyageClient {
  private apiKey = process.env.VOYAGE_API_KEY

async embed(text: string): Promise<number[]> {
  // --- Fallback для локальной разработки ---
  if (!this.apiKey) {
    console.warn("[VOYAGE] API key not set, using mock embedding")
    // Возвращаем псевдо-рандомный вектор на основе хэша текста
    const hash = text.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
    return Array(1024).fill(0).map((_, i) => ((hash + i * 7) % 1000 - 500) / 1000)
  }

  const res = await fetch("https://api.voyageai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.apiKey}`
    },
    body: JSON.stringify({
      input: text,
      model: process.env.VOYAGE_MODEL || "voyage-4-lite"
    })
  })

  if (!res.ok) {
    const errText = await res.text()
    console.warn("[VOYAGE] API error, using mock embedding:", errText.slice(0, 100))
    // Fallback при ошибке API
    const hash = text.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0)
    return Array(1024).fill(0).map((_, i) => ((hash + i * 7) % 1000 - 500) / 1000)
  }

  const data: any = await res.json()

  // --- поддержка всех форматов ---
  if (data.embeddings && data.embeddings.length > 0) {
    return data.embeddings[0]
  }

  if (data.data && data.data.length > 0 && data.data[0].embedding) {
    return data.data[0].embedding
  }

  throw new Error("Voyage embedding failed: empty response")
}
}
