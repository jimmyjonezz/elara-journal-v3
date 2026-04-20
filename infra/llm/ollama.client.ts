import { Ollama } from "ollama"

export class OllamaClient {
  private client: Ollama

  constructor() {
    this.client = new Ollama({
      host: "https://ollama.com",
      headers: {
        Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`
      }
    })
  }

  async generate(prompt: string): Promise<string> {
    const maxRetries = 3
    const delay = 30000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await this.client.chat({
          model: process.env.OLLAMA_MODEL || "qwen3.5:cloud",
          messages: [
            { role: "user", content: prompt }
          ],
          options: {
            temperature: 0.85,
            repeat_penalty: 1.1,
            top_p: 0.85,
            top_k: 40
          }
        })

        return res.message?.content || "Empty response"

      } catch (e: any) {
        const isUnauthorized = e?.status === 401 || e?.status === 403
        const isServerError = e?.status >= 500

        console.error(`OLLAMA ERROR (attempt ${attempt}/${maxRetries}):`, e?.message || e)

        if (attempt === maxRetries) {
          throw new Error(`Ollama failed after ${maxRetries} attempts: ${e?.message || e}`)
        }

        if (isUnauthorized) {
          throw new Error(`Ollama unauthorized: ${e?.message || e}`)
        }

        console.log(`Retrying in ${delay / 1000}s...`)
        await new Promise(r => setTimeout(r, delay))
      }
    }

    throw new Error("Ollama: unexpected exit")
  }
}