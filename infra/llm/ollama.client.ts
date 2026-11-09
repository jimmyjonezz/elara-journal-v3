import { LLMClient } from "../../interfaces/llm"

// Ollama Cloud — OpenAI-совместимый endpoint (/v1/chat/completions).
// Раньше использовался npm-клиент `ollama`, который ходит на /api/chat —
// это путь self-hosted Ollama; для облака он возвращал 404
// («path /v1/api/chat not found»). Cloud говорит на REST в стиле OpenAI.
// Ключ — GitHub Secret OLLAMA_API_KEY (пробрасывается в journal.yml).
const API_BASE = process.env.OLLAMA_BASE_URL || "https://ollama.com/v1"
const API_URL = `${API_BASE.replace(/\/+$/, "")}/chat/completions`
const API_KEY = process.env.OLLAMA_API_KEY
const MODEL = process.env.OLLAMA_MODEL || "gemma4:31b-cloud"

export class OllamaClient implements LLMClient {
  async generate(
    prompt: string,
    options?: {
      temperature?: number
      top_p?: number
      frequency_penalty?: number
      presence_penalty?: number
    }
  ): Promise<string> {
    const maxRetries = 3
    const baseDelay = 10000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        if (!API_KEY) {
          throw new Error("OLLAMA_API_KEY не задан (GitHub Secret)")
        }

        const res = await fetch(API_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${API_KEY}`,
          },
          signal: AbortSignal.timeout(120_000),
          body: JSON.stringify({
            model: MODEL,
            messages: [{ role: "user", content: prompt }],
            temperature: options?.temperature ?? 0.85,
            top_p: options?.top_p ?? 0.85,
            // [STAGE 3] Штрафы за повтор — были потеряны при переходе на
            // OpenAI-совместимый endpoint (старый клиент слал repeat_penalty 1.1)
            frequency_penalty: options?.frequency_penalty ?? 0.4,
            presence_penalty: options?.presence_penalty ?? 0.3,
            stream: false,
          }),
        })

        if (!res.ok) {
          const errorText = await res.text()
          const err: any = new Error(
            `Ollama API ${res.status}: ${errorText.slice(0, 300)}`
          )
          err.status = res.status
          throw err
        }

        const result = await res.json()
        const content: string | null =
          result?.choices?.[0]?.message?.content?.trim() || null

        if (!content) {
          throw new Error(
            `Empty content from model (attempt ${attempt}/${maxRetries}): ${JSON.stringify(result).slice(0, 200)}`
          )
        }

        return content
      } catch (e: any) {
        const isUnauthorized = e?.status === 401 || e?.status === 403

        console.error(
          `OLLAMA ERROR (attempt ${attempt}/${maxRetries}):`,
          e?.message || e
        )

        if (attempt === maxRetries) {
          throw new Error(
            `Ollama failed after ${maxRetries} attempts: ${e?.message || e}`
          )
        }

        if (isUnauthorized) {
          throw new Error(`Ollama unauthorized: ${e?.message || e}`)
        }

        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`Retrying in ${delay / 1000}s...`)
        await new Promise((r) => setTimeout(r, delay))
      }
    }

    throw new Error("Ollama: unexpected exit")
  }
}
