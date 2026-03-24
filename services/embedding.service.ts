// ---------- /services/embedding.service.ts ----------
import { EmbeddingService } from "../interfaces/embedding"
//import { OpenAIClient } from "../infra/llm/openai.client"
import { OllamaClient } from "../infra/llm/ollama.client"

export class OpenAIEmbeddingService implements EmbeddingService {
  constructor(private client: OllamaClient) {}

  async embed(text: string): Promise<number[]> {
    return this.client.embed(text)
  }
}
