// ---------- /services/embedding.service.ts ----------
import { EmbeddingService } from "../interfaces/embedding"
//import { OpenAIClient } from "../infra/llm/openai.client"
import { OllamaClient } from "../infra/llm/ollama.client"

export class OllamaEmbeddingService implements EmbeddingService {
  constructor(private embedding: EmbeddingService) {}

  async embed(text: string): Promise<number[]> {
    return this.client.embed(text)
  }
}
