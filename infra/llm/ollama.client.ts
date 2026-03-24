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
    try {
      const res = await this.client.chat({
        model: process.env.OLLAMA_MODEL || "gpt-oss:120b",
        messages: [
          { role: "user", content: prompt }
        ]
      })

      return res.message?.content || "Empty response"

    } catch (e: any) {
      console.error("OLLAMA ERROR:", e.message)
      return "[Fallback: Ollama unavailable]"
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const res = await this.client.embeddings({
        model: "nomic-embed-text",
        prompt: text
      })

      return res.embedding || []
    } catch (e: any) {
      console.error("EMBED ERROR:", e?.message || e)
      throw e
    }
    }
  }
}
