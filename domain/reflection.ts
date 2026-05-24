// domain/reflection.ts

export interface Reflection {
  id: string
  entryId: string
  analysis: string

  score: number
  repetitionScore: number

  issues: string[]
  improvements: string[]
  themes: string[]

  // ✅ новое поле
  newInsights: string[]

  // ✅ системное напряжение
  systemTension: string[]

  // ✅ заброшенные сюжетные линии (были в истории, не получили развития)
  abandonedThreads: string[]

  createdAt: Date
}
