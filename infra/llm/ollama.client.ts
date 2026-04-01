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
      console.error("OLLAMA ERROR:", e?.message || e)
      return "[Fallback: Ollama unavailable]"
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      const res: any = await this.client.embeddings({
        model: "ollama pull nomic-embed-text-v2-moe",
        prompt: text
      })

      // Лог для диагностики (можно убрать позже)
      console.log("RAW EMBED RESPONSE:", res)

      // Поддержка разных форматов ответа
      if (res.embedding && Array.isArray(res.embedding)) {
        return res.embedding
      }

      if (res.embeddings && Array.isArray(res.embeddings) && res.embeddings.length > 0) {
        return res.embeddings[0]
      }

      throw new Error("Invalid embedding response format")

    } catch (e: any) {
      console.error("EMBED ERROR:", e?.message || e)
      throw e
    }
  }
}
