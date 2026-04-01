// domain/context.ts
import { Entry } from "./entry"
import { Reflection } from "./reflection"

export interface SelfState {
  mood: string
  themes: string[]
  drift: number
  confidence: number
}

export interface Context {
  recentEntries: Entry[]
  semanticMatches: Entry[]
  reflections: Reflection[]
  workingMemory: any[]
  state: SelfState
}
