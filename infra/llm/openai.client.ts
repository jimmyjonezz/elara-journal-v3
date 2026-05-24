//infra/llm/openai.client.ts
import OpenAI from "openai"
import { LLMClient } from "../../interfaces/llm"

export class OpenAIClient implements LLMClient {
  private client: OpenAI

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY
    })
  }

  async generate(prompt: string): Promise<string> {
    const maxRetries = 3
    const baseDelay = 5000

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const res = await this.client.chat.completions.create({
          model: process.env.OPENAI_MODEL || "gpt-4.1-nano",
          messages: [{ role: "user", content: prompt }]
        })

        const content = res.choices[0]?.message?.content

        if (!content?.trim()) {
          throw new Error(`Empty content (attempt ${attempt}/${maxRetries})`)
        }

        return content

      } catch (e: any) {
        console.error(`OPENAI ERROR (attempt ${attempt}/${maxRetries}):`, e?.message || e)

        if (attempt === maxRetries) {
          throw new Error(`OpenAI failed after ${maxRetries} attempts: ${e?.message || e}`)
        }

        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`Retrying in ${delay / 1000}s...`)
        await new Promise(r => setTimeout(r, delay))
      }
    }

    throw new Error("OpenAI: unexpected exit")
  }
}
