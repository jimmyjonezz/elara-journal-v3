// ---------- /interfaces/embedding.ts ----------
export interface EmbeddingService {
  // inputType: "document" по умолчанию — сезонные якоря и записи эмбеддятся
  // в одном режиме, иначе косинус между коротким якорем и длинной записью
  // получается смещённым (voyage-4-lite различает query/document)
  embed(text: string, inputType?: "query" | "document"): Promise<number[]>

  // Батч (до 128 текстов за запрос). Нужен для precalc сезонных якорей:
  // бесплатный Voyage даёт 3 RPM, и 63 одиночных запроса упираются в лимит,
  // а один батч — 1 запрос.
  embedBatch(texts: string[], inputType?: "query" | "document"): Promise<number[][]>
}
