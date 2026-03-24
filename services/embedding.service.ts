import { EmbeddingService } from "../interfaces/embedding"
import { OllamaClient } from "../infra/llm/ollama.client"

export class OllamaEmbeddingService implements EmbeddingService {
  constructor(private client: OllamaClient) {}

  async embed(text: string): Promise<number[]> {
    const res = await this.client.embed(text)
    return res
  }
}
