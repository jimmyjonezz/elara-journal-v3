// domain/context.ts
import { Entry } from "./entry"
import { Reflection } from "./reflection"
import { SelfState } from "./self-state"
import { SeasonalAnchor } from "../services/seasonal.service"

export { SelfState }

export interface Context {
  recentEntries: Entry[]
  distantEchoes: Entry[]
  reflections: Reflection[]
  workingMemory: string[]
  state: SelfState
  exhaustedMotifs: string[]
  seasonalAnchor?: SeasonalAnchor
}
