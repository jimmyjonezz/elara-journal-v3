// ---------- /interfaces/memory.ts ----------
import { Entry } from "../domain/entry"
import { Reflection } from "../domain/reflection"
import { Context } from "../domain/context"

export interface Memory {
  getRecent(limit: number): Promise<Entry[]>
  searchSemantic(query: string, limit: number): Promise<Entry[]>
  storeEntry(entry: Entry): Promise<void>
  storeReflection(reflection: Reflection): Promise<void>
  buildContext(): Promise<Context>
}
