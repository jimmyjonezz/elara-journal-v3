export interface Reflection {
  id: string
  score: number
  entryId: string
  analysis: string
  selfScore: number
  issues: string[]
  improvements: string[]
  themes: string[]
  createdAt: Date
}
