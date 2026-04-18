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
      console.error("OLLAMA ERROR:", e?.message || e)
      return "[Fallback: Ollama unavailable]"
    }
  }
}