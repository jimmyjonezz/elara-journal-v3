import { Ollama, ChatResponse } from "ollama"

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

  async generate(
    prompt: string, 
    options?: {
      system?: string;      // Системный промпт для стиля
      temperature?: number; // Креативность
      maxTokens?: number;   // Лимит ответа
    }
  ): Promise<string> {
    try {
      const res: ChatResponse = await this.client.chat({
        model: process.env.OLLAMA_MODEL || "qwen3.5:9b", // ← Рекомендуемая модель
        messages: [
          ...(options?.system ? [{ role: "system", content: options.system }] : []),
          { role: "user", content: prompt }
        ],
        options: {
          temperature: options?.temperature ?? 0.75,
          top_p: 0.9,
          top_k: 40,
          repeat_penalty: 1.1,
          presence_penalty: 0.3,
          frequency_penalty: 0.3,
          num_ctx: 8192,
          num_predict: options?.maxTokens ?? 2048,
          seed: -1
        }
      })

      return res.message?.content || "Empty response"

    } catch (e: any) {
      console.error("OLLAMA ERROR:", e?.message || e)
      return "[Fallback: Ollama unavailable]"
    }
  }

  async embed(text: string): Promise<number[]> {
    try {
      // ✅ Правильное имя модели (без "ollama pull")
      // ✅ Используем "input" вместо "prompt"
      const res = await this.client.embeddings({
        model: "nomic-embed-text-v2-moe", // или "bge-m3", "mxbai-embed-large"
        input: text
      })

      console.log("EMBED RESPONSE:", { 
        dims: res.embedding?.length, 
        sample: res.embedding?.slice(0, 5) 
      })

      if (!res.embedding || !Array.isArray(res.embedding)) {
        throw new Error("Invalid embedding response format")
      }

      return res.embedding

    } catch (e: any) {
      console.error("EMBED ERROR:", e?.message || e)
      throw e
    }
  }
}
