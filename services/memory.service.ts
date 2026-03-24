// ---------- /services/memory.service.ts ----------
import { Memory } from "../interfaces/memory"
import { Entry } from "../domain/entry"
import { Reflection } from "../domain/reflection"
import { Context } from "../domain/context"
import * as fs from "fs"

export class JsonMemoryService implements Memory {
  private file = "./data/entries.json"

  private read(): Entry[] {
  if (!fs.existsSync(this.file)) return []

  const raw = JSON.parse(fs.readFileSync(this.file, "utf-8"))

  return raw.map((e: any) => ({
    ...e,
    createdAt: new Date(e.createdAt)
  }))
  }

  private write(entries: Entry[]) {
    fs.writeFileSync(this.file, JSON.stringify(entries, null, 2))
  }

  async getRecent(limit: number): Promise<Entry[]> {
    const entries = this.read()
    return entries.slice(-limit)
  }

  async searchSemantic(query: string, limit: number): Promise<Entry[]> {
  return []
  }

  async storeEntry(entry: Entry): Promise<void> {
    const entries = this.read()
    entries.push(entry)
    this.write(entries)
  }

  async storeReflection(reflection: Reflection): Promise<void> {
    // можно позже вынести отдельно
  }

  async buildContext(): Promise<Context> {
    return {
      recentEntries: await this.getRecent(5),
      semanticMatches: [],
      workingMemory: []
    }
  }
}
