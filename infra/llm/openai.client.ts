infra/llm/openai.client.ts
import OpenAI from "openai"
import * as dotenv from "dotenv"

dotenv.config()

export class OpenAIClient {
  private client = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  })

  async generate(prompt: string): Promise<string> {
    const res = await this.client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    })

    return res.choices[0].message.content || ""
  }

  async embed(text: string): Promise<number[]> {
    const res = await this.client.embeddings.create({
      model: "text-embedding-3-small",
      input: text
    })

    return res.data[0].embedding
  }
}
