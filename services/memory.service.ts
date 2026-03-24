// ---------- /services/memory.service.ts ----------
import { Memory } from "../interfaces/memory"
import { Entry } from "../domain/entry"
import { Reflection } from "../domain/reflection"
import { Context } from "../domain/context"

export class InMemoryMemoryService implements Memory {
  private entries: Entry[] = []
  private reflections: Reflection[] = []

  async getRecent(limit: number): Promise<Entry[]> {
    return this.entries.slice(-limit)
  }

  async searchSemantic(): Promise<Entry[]> {
    return []
  }

  async storeEntry(entry: Entry): Promise<void> {
    this.entries.push(entry)
  }

  async storeReflection(reflection: Reflection): Promise<void> {
    this.reflections.push(reflection)
  }

  async buildContext(): Promise<Context> {
    return {
      recentEntries: await this.getRecent(5),
      semanticMatches: [],
      workingMemory: []
    }
  }
}
