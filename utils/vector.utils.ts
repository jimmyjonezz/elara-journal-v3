//vector.utils.ts
export function cosineSimilarity(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

// [STAGE 4] MMR (Maximal Marginal Relevance): записи, релевантные запросу,
// но максимально отличающиеся друг от друга. До этого searchSemantic брал
// top-3 по cos — а это сама последняя запись (cos=1.0) + её ближайшие
// соседи = усиление аттрактора.
// λ=1 → чистая релевантность, λ=0 → максимальное разнообразие.
export interface MmrCandidate<T> {
  item: T
  vector: number[]
}

export function mmrSelect<T>(
  queryVec: number[],
  candidates: MmrCandidate<T>[],
  k: number,
  lambda = 0.5
): T[] {
  if (!candidates.length || !queryVec.length) return []

  const remaining = [...candidates]
  const selected: MmrCandidate<T>[] = []
  const selectedVecs: number[][] = []

  while (remaining.length && selected.length < k) {
    let bestIdx = 0
    let bestScore = -Infinity

    for (let i = 0; i < remaining.length; i++) {
      const rel = cosineSimilarity(queryVec, remaining[i].vector)
      const div = selectedVecs.length
        ? Math.max(...selectedVecs.map(v => cosineSimilarity(remaining[i].vector, v)))
        : 0
      const score = lambda * rel - (1 - lambda) * div
      if (score > bestScore) {
        bestScore = score
        bestIdx = i
      }
    }

    const [picked] = remaining.splice(bestIdx, 1)
    selected.push(picked)
    selectedVecs.push(picked.vector)
  }

  return selected.map(s => s.item)
}
