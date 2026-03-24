// ---------- /services/embedding.service.ts ----------
import { EmbeddingService } from "../interfaces/embedding"

export class MockEmbeddingService implements EmbeddingService {
  async embed(): Promise<number[]> {
    return [0, 0, 0]
  }
}
