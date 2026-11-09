// domain/motif-state.ts

export interface MotifEntry {
  id: string
  label: string
  patterns: string[]
  count: number
  exhaustion: number
}

export interface MotifState {
  motifs: Record<string, MotifEntry>
  totalScanned: number
  // [STAGE 2] Идемпотентность: id уже отсканированных записей.
  // Раньше backfill пересчитывал все записи на каждом CI-прогоне
  // (in-memory флаг backfilled) → totalScanned 2037 при 22 записях.
  scannedIds?: string[]
}
