import { EmbeddingService } from "../interfaces/embedding"
import { OllamaClient } from "../infra/llm/ollama.client"

export class OllamaEmbeddingService implements EmbeddingService {
  constructor(private client: OllamaClient) {}

  async embed(text: string): Promise<number[]> {
    return this.client.embed(text)
  }
}
