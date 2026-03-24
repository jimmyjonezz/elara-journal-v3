// ---------- /interfaces/embedding.ts ----------
export interface EmbeddingService {
  embed(text: string): Promise<number[]>
}
