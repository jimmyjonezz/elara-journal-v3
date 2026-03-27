// services/memory.service.ts

import * as fs from "fs"
import * as path from "path"

import { Memory } from "../interfaces/memory"
import { Entry } from "../domain/entry"
import { Reflection } from "../domain/reflection"
import { Context } from "../domain/context"
import { EmbeddingService } from "../interfaces/embedding"
import { SelfState } from "../domain/self-state"
import { cosineSimilarity } from "../utils/vector.utils"
import { normalizeEmbedding } from "../utils/embedding.utils"

export class JsonMemoryService implements Memory {
  private filePath = path.resolve("data/entries.json")
  private reflectionPath = path.resolve("data/reflections.json")
  private selfStatePath = path.resolve("data/self-state.json")

  constructor(private embedding: EmbeddingService) {}

  // -----------------------
  // Internal helpers
  // -----------------------

  private read(): Entry[] {
    if (!fs.existsSync(this.filePath)) return []

    try {
      const raw = JSON.parse(fs.readFileSync(this.filePath, "utf-8"))
      return raw.map((e: any) => ({
        ...e,
        createdAt: new Date(e.createdAt),
        embedding: normalizeEmbedding(e.embedding)
      }))
    } catch {
      return []
    }
  }

  // memory.service.ts

private write(entries: Entry[]) {
  fs.mkdirSync(path.dirname(this.filePath), { recursive: true })

  const json = JSON.stringify(entries, null, 2)

  // 🔧 схлопываем embedding массивы в одну строку
  const compact = json.replace(
    /"embedding": \[\s*([^\]]+?)\s*\]/g,
    (_, content) => {
      return `"embedding": [${content.replace(/\s+/g, " ")}]`
    }
  )

  fs.writeFileSync(this.filePath, compact)
}

  private readReflections(): Reflection[] {
    if (!fs.existsSync(this.reflectionPath)) return []

    try {
      return JSON.parse(fs.readFileSync(this.reflectionPath, "utf-8"))
    } catch {
      return []
    }
  }

  private writeReflections(reflections: Reflection[]) {
    fs.mkdirSync(path.dirname(this.reflectionPath), { recursive: true })
    fs.writeFileSync(
      this.reflectionPath,
      JSON.stringify(reflections, null, 2)
    )
  }

  // -----------------------
  // Self state
  // -----------------------

  async getSelfState(): Promise<SelfState> {
    if (!fs.existsSync(this.selfStatePath)) {
      const initial: SelfState = {
        mood: "calm",
        themes: [],
        drift: 0.3,
        confidence: 0.5
      }
      await this.saveSelfState(initial)
      return initial
    }

    try {
      const raw = JSON.parse(
        fs.readFileSync(this.selfStatePath, "utf-8")
      )

      return {
        mood: raw.mood || "calm",
        themes: raw.themes || [],
        drift: raw.drift ?? 0.3,
        confidence: raw.confidence ?? 0.5
      }
    } catch {
      return {
        mood: "calm",
        themes: [],
        drift: 0.3,
        confidence: 0.5
      }
    }
  }

  async saveSelfState(state: SelfState): Promise<void> {
    fs.mkdirSync(path.dirname(this.selfStatePath), { recursive: true })

    fs.writeFileSync(
      this.selfStatePath,
      JSON.stringify(state, null, 2)
    )
  }

  // -----------------------
  // Entries / reflections
  // -----------------------

  async getRecent(limit: number): Promise<Entry[]> {
    return this.read()
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  async getRecentReflections(limit: number): Promise<Reflection[]> {
    return this.readReflections().slice(-limit)
  }

  async storeEntry(entry: Entry): Promise<void> {
    const entries = this.read()
    entries.push(entry)
    this.write(entries)
  }

  async storeReflection(reflection: Reflection): Promise<void> {
    const reflections = this.readReflections()
    reflections.push(reflection)
    this.writeReflections(reflections)
  }

  // -----------------------
  // Semantic + context
  // -----------------------

  async searchSemantic(query: string, limit: number): Promise<Entry[]> {
    const entries = this.read()
    if (!entries.length) return []

    const queryEmbedding = await this.embedding.embed(query)

    return entries
      .filter(e => e.embedding?.length)
      .map(e => ({
        entry: e,
        score: cosineSimilarity(queryEmbedding, e.embedding)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(e => e.entry)
  }

  // services/memory.service.ts

async buildContext(): Promise<Context> {
  const recentEntries = await this.getRecent(5)
  const reflections = await this.getRecentReflections(3)
  const state = await this.getSelfState()

  const semanticMatches =
    recentEntries.length > 0
      ? await this.searchSemantic(
          recentEntries[0].content,
          3
        )
      : []

  return {
    recentEntries,
    semanticMatches,
    reflections,
    state,
    workingMemory: []
  }
}
}
