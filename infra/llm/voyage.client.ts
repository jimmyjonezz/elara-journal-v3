export class VoyageClient {
  private apiKey = process.env.VOYAGE_API_KEY!

  async embed(text: string): Promise<number[]> {
    const res = await fetch("https://api.voyageai.com/v1/embeddings", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        input: text,
        model: "voyage-4-lite" // оптимально для твоего кейса
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Voyage API error: ${errText}`)
    }

    const data = await res.json()

    if (!data.embeddings || data.embeddings.length === 0) {
      throw new Error("Voyage embedding failed: empty response")
    }

    return data.embeddings[0]
  }
}
