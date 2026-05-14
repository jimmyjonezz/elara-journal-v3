import OpenAI from "openai"
import { LLMClient } from "../../interfaces/llm"

export class OpenCodeClient implements LLMClient {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENCODE_API_KEY,
      baseURL: "https://opencode.ai/zen/v1",
      dangerouslyAllowBrowser: false
    })
  }

  async generate(prompt: string): Promise<string> {
    const maxRetries = 3
    const baseDelay = 5000 // start at 5s, exponential backoff: 5s, 10s, 20s

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await this.client.chat.completions.create({
          model: process.env.OPENCODE_MODEL || "minimax-m2.5-free",
          messages: [
            { role: "user", content: prompt }
          ],
          temperature: 0.85,
          top_p: 0.85
        })

        const content = res.choices[0]?.message?.content

        // Treat null / empty / whitespace-only as a retry-able failure
        if (!content || !content.trim()) {
          throw new Error(`Empty content from model (attempt ${attempt}/${maxRetries})`)
        }

        return content

      } catch (e: any) {
        const isUnauthorized = e?.status === 401 || e?.status === 403
        const isServerError = e?.status >= 500

        console.error(`OPENCODE ERROR (attempt ${attempt}/${maxRetries}):`, e?.message || e)

        if (attempt === maxRetries) {
          throw new Error(`OpenCode failed after ${maxRetries} attempts: ${e?.message || e}`)
        }

        if (isUnauthorized) {
          throw new Error(`OpenCode unauthorized: ${e?.message || e}`)
        }

        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`Retrying in ${delay / 1000}s...`)
        await new Promise(r => setTimeout(r, delay))
      }
    }

    throw new Error("OpenCode: unexpected exit")
  }
}