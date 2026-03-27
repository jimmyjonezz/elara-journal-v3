// utils/embedding.utils.ts

export function compressEmbedding(vec: number[]): number[] {
  return vec.map(v => +v.toFixed(3))
}

export function normalizeEmbedding(input: any): number[] {
  if (!Array.isArray(input)) return []

  return input
    .map(v => Number(v))
    .filter(v => Number.isFinite(v))
    .map(v => +v.toFixed(3))
}
