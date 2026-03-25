import { EmbeddingService } from "../interfaces/embedding"
import { VoyageClient } from "../infra/llm/voyage.client"

export class VoyageEmbeddingService implements EmbeddingService {
  constructor(private client: VoyageClient) {}

  async embed(text: string): Promise<number[]> {
    return this.client.embed(text)
  }
}
