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
        model: "voyage-2"
      })
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`Voyage API error: ${errText}`)
    }

    const data: any = await res.json()

    if (data.data && data.data.length > 0 && data.data[0].embedding) {
      return data.data[0].embedding
    }

    throw new Error("Voyage embedding failed: empty response")
  }
}
