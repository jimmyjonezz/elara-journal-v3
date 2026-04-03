// utils/embedding.utils.ts

export function normalizeEmbedding(input: any): number[] {
  if (!Array.isArray(input)) return []

  return input
    .map(v => Number(v))
    .filter(v => Number.isFinite(v))
    .map(v => +v.toFixed(3))
}
