import { Ollama, ChatResponse } from "ollama"

export class OllamaClient {
  private client: Ollama
  private maxRetries = 3
  private retryDelay = 2000

  constructor() {
    this.client = new Ollama({
      host: "https://ollama.com",
      headers: {
        Authorization: `Bearer ${process.env.OLLAMA_API_KEY}`
      }
    })
  }

  async generate(
    prompt: string,
    options?: {
      system?: string
      temperature?: number
      maxTokens?: number
    }
  ): Promise<string> {
    let lastError: any

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const res: ChatResponse = await this.client.chat({
          model: process.env.OLLAMA_MODEL || "qwen3.5:cloud",
          messages: [
            ...(options?.system ? [{ role: "system", content: options.system }] : []),
            { role: "user", content: prompt }
          ],
          options: {
            temperature: options?.temperature ?? 0.8,
            top_p: 0.85,
            top_k: 60,
            repeat_penalty: 1.05,
            presence_penalty: 0.0,
            frequency_penalty: 0.0,
            num_ctx: 8192,
            num_predict: options?.maxTokens ?? 2048
          }
        })

        return res.message?.content || "Empty response"

      } catch (e: any) {
        lastError = e
        const errorMsg = e?.message || e

        if (attempt < this.maxRetries) {
          console.warn(`OLLAMA attempt ${attempt} failed, retrying in ${this.retryDelay}ms...`)
          await new Promise(resolve => setTimeout(resolve, this.retryDelay))
        }
      }
    }

    console.error("OLLAMA ERROR after retries:", lastError?.message || lastError)
    return "[Fallback: Ollama unavailable]"
  }

  async embed(text: string): Promise<number[]> {
    let lastError: any

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const res: any = await this.client.embeddings({
          model: "nomic-embed-text-v2-moe",
          input: text
        })

        if (res.embedding && Array.isArray(res.embedding)) {
          return res.embedding
        }

        if (res.embeddings && Array.isArray(res.embeddings) && res.embeddings.length > 0) {
          return res.embeddings[0]
        }

        throw new Error("Invalid embedding response format")

      } catch (e: any) {
        lastError = e
        if (attempt < this.maxRetries) {
          console.warn(`EMBED attempt ${attempt} failed, retrying...`)
          await new Promise(resolve => setTimeout(resolve, this.retryDelay))
        }
      }
    }

    console.error("EMBED ERROR after retries:", lastError?.message || lastError)
    throw lastError || new Error("Embedding failed")
  }
}
