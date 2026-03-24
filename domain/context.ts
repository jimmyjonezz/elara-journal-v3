// ---------- /domain/context.ts ----------
import { Entry } from "./entry"

export type Context = {
  recentEntries: Entry[]
  semanticMatches: Entry[]
  workingMemory: string[]
}
