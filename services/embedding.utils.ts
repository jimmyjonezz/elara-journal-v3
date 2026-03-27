// utils/embedding.utils.ts

export function compressEmbedding(vec: number[]): number[] {
  return vec.map(v => +v.toFixed(3))
}
