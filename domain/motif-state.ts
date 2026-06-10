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
}
