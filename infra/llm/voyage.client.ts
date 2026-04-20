export class VoyageClient {
  private apiKey = process.env.VOYAGE_API_KEY!

  async embed(text: string): Promise<number[]> {
    const maxRetries = 3
    const delay = 10000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
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
          throw new Error(`Voyage API error: ${errText}`)
        }

        const data: any = await res.json()

        if (data.embeddings && data.embeddings.length > 0) {
          return data.embeddings[0]
        }

        if (data.data && data.data.length > 0 && data.data[0].embedding) {
          return data.data[0].embedding
        }

        throw new Error("Voyage embedding failed: empty response")

      } catch (e: any) {
        console.error(`VOYAGE ERROR (attempt ${attempt}/${maxRetries}):`, e?.message || e)

        if (attempt === maxRetries) {
          throw new Error(`Voyage failed after ${maxRetries} attempts: ${e?.message || e}`)
        }

        console.log(`Retrying in ${delay / 1000}s...`)
        await new Promise(r => setTimeout(r, delay))
      }
    }

    throw new Error("Voyage: unexpected exit")
  }
}