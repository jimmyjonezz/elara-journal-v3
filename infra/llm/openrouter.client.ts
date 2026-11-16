import OpenAI from "openai"
import { LLMClient } from "../../interfaces/llm"

// OpenRouter — OpenAI-compatible шлюз. Бесплатные модели с суффиксом :free.
// Ключ — GitHub Secret OPENROUTER_API_KEY (пробрасывается в journal.yml).
// Локально: curl/urllib отбиваются WAF'ом ("Missing Authentication header"),
// но openai SDK проходит. Поэтому только SDK.

const API_KEY = process.env.OPENROUTER_API_KEY
const MODEL = process.env.OPENROUTER_MODEL || "baidu/ernie-5.5-flash-preview:free"

export class OpenRouterClient implements LLMClient {
  private client: OpenAI

  constructor() {
    if (!API_KEY) {
      throw new Error("OPENROUTER_API_KEY не задан (GitHub Secret)")
    }
    this.client = new OpenAI({
      apiKey: API_KEY,
      baseURL: "https://openrouter.ai/api/v1",
      dangerouslyAllowBrowser: false
    })
  }

  async generate(prompt: string, options?: { temperature?: number; top_p?: number }): Promise<string> {
    const maxRetries = 3
    const baseDelay = 5000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await this.client.chat.completions.create({
          model: MODEL,
          messages: [{ role: "user", content: prompt }],
          temperature: options?.temperature ?? 0.85,
          top_p: options?.top_p ?? 0.85
        })

        const content = res.choices[0]?.message?.content

        if (!content || !content.trim()) {
          throw new Error(`Empty content from ${MODEL} (attempt ${attempt}/${maxRetries})`)
        }

        return content

      } catch (e: any) {
        const isUnauthorized = e?.status === 401 || e?.status === 403
        console.error(`OPENROUTER ERROR (attempt ${attempt}/${maxRetries}):`, e?.message || e)

        if (attempt === maxRetries) {
          throw new Error(`OpenRouter failed after ${maxRetries} attempts: ${e?.message || e}`)
        }

        if (isUnauthorized) {
          throw new Error(`OpenRouter unauthorized: ${e?.message || e}`)
        }

        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`Retrying in ${delay / 1000}s...`)
        await new Promise(r => setTimeout(r, delay))
      }
    }

    throw new Error("OpenRouter: unexpected exit")
  }
}
