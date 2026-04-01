// domain/reflection.ts

export interface Reflection {
  id: string
  entryId: string
  analysis: string

  score: number

  issues: string[]
  improvements: string[]
  themes: string[]

  newInsights: string[]

  secondary: string[]

  createdAt: Date
}
