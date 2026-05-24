import { Ollama } from "ollama"
import { LLMClient } from "../../interfaces/llm"

export class OllamaClient implements LLMClient {
  private client: Ollama

  constructor() {
    this.client = new Ollama({
      host: process.env.OLLAMA_HOST || "http://localhost:11434"
    })
  }

  async generate(prompt: string): Promise<string> {
    const maxRetries = 3
    const baseDelay = 10000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await this.client.chat({
          model: process.env.OLLAMA_MODEL || "llama3.2",
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

        const content = res.message?.content

        if (!content?.trim()) {
          throw new Error(`Empty content from model (attempt ${attempt}/${maxRetries})`)
        }

        return content

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

        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`Retrying in ${delay / 1000}s...`)
        await new Promise(r => setTimeout(r, delay))
      }
    }

    throw new Error("Ollama: unexpected exit")
  }
}