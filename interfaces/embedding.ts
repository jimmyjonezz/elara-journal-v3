// ---------- /interfaces/embedding.ts ----------
export interface EmbeddingService {
  // inputType: "document" по умолчанию — сезонные якоря и записи эмбеддятся
  // в одном режиме, иначе косинус между коротким якорем и длинной записью
  // получается смещённым (voyage-4-lite различает query/document)
  embed(text: string, inputType?: "query" | "document"): Promise<number[]>
}
