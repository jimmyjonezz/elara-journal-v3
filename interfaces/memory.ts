// interfaces/memory.ts

import { Entry } from "../domain/entry"
import { Reflection } from "../domain/reflection"
import { Context } from "../domain/context"
import { SelfState } from "../domain/self-state"

export interface Memory {
  getRecent(limit: number): Promise<Entry[]>
  getRecentReflections(limit: number): Promise<Reflection[]>

  searchSemantic(query: string, limit: number): Promise<Entry[]>

  buildContext(): Promise<Context>

  storeEntry(entry: Entry): Promise<void>
  storeReflection(reflection: Reflection): Promise<void>

  getSelfState(): Promise<SelfState>
  saveSelfState(state: SelfState): Promise<void>
}
