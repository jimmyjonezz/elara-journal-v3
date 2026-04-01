// domain/context.ts
import { Entry } from "./entry"
import { Reflection } from "./reflection"
import { SelfState } from "./self-state"

export interface Context {
  recentEntries: Entry[]
  semanticMatches: Entry[]
  reflections: Reflection[]
  workingMemory: any[]
  state: SelfState
}
