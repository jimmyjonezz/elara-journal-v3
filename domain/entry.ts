// ---------- /domain/entry.ts ----------
export type Entry = {
  id: string
  content: string
  createdAt: Date
  embedding: number[]
  meta?: {
    mood?: string
    topic?: string
    tags?: string[]
  }
  score?: number
}
