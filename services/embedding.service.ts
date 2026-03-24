// ---------- /services/embedding.service.ts ----------
import { EmbeddingService } from "../interfaces/embedding"
import { OpenAIClient } from "../infra/llm/openai.client"

export class OpenAIEmbeddingService implements EmbeddingService {
  constructor(private client: OpenAIClient) {}

  async embed(text: string): Promise<number[]> {
    return this.client.embed(text)
  }
}
