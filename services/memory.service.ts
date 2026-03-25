// services/memory.service.ts

import * as fs from "fs"
import * as path from "path"

import { Memory } from "../interfaces/memory"
import { Entry } from "../domain/entry"
import { Reflection } from "../domain/reflection"
import { Context } from "../domain/context"
import { EmbeddingService } from "../interfaces/embedding"
import { SelfState } from "../domain/self-state"
import { cosineSimilarity } from "./vector.utils"

export class JsonMemoryService implements Memory {
  private filePath = path.resolve("data/entries.json")
  private reflectionPath = path.resolve("data/reflections.json")
  private selfStatePath = path.resolve("data/self-state.json")

  constructor(private embedding: EmbeddingService) {}

  // ==================== PRIVATE HELPERS ====================

  private read(): Entry[] {
    if (!fs.existsSync(this.filePath)) return []

    const raw = JSON.parse(fs.readFileSync(this.filePath, "utf-8"))

    return raw.map((e: any) => ({
      ...e,
      createdAt: new Date(e.createdAt),
      embedding: e.embedding || []
    }))
  }

  private write(entries: Entry[]) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true })

    const formatted = JSON.stringify(
      entries,
      (key, value) => {
        if (key === "embedding" && Array.isArray(value)) {
          return `[${value.join(",")}]`
        }
        return value
      },
      2
    ).replace(/"\[(.*?)\]"/g, "[$1]")

    fs.writeFileSync(this.filePath, formatted)
  }

  private readReflections(): Reflection[] {
    if (!fs.existsSync(this.reflectionPath)) return []
    return JSON.parse(fs.readFileSync(this.reflectionPath, "utf-8"))
  }

  private writeReflections(reflections: Reflection[]) {
    fs.mkdirSync(path.dirname(this.reflectionPath), { recursive: true })
    fs.writeFileSync(
      this.reflectionPath,
      JSON.stringify(reflections, null, 2)
    )
  }

  // ==================== SELF STATE ====================

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

    const raw = JSON.parse(
      fs.readFileSync(this.selfStatePath, "utf-8")
    )

    return raw
  }

  async saveSelfState(state: SelfState): Promise<void> {
    fs.mkdirSync(path.dirname(this.selfStatePath), { recursive: true })

    fs.writeFileSync(
      this.selfStatePath,
      JSON.stringify(state, null, 2)
    )
  }

  // ==================== PUBLIC ====================

  async getRecent(limit: number): Promise<Entry[]> {
    const entries = this.read()

    return entries
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  async getRecentReflections(limit: number): Promise<Reflection[]> {
    const data = this.readReflections()
    return data.slice(-limit)
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

  async buildContext(): Promise<Context> {
    const recentEntries = await this.getRecent(5)

    return {
      recentEntries,
      semanticMatches: [],
      workingMemory: []
    }
  }

  async searchSemantic(query: string, limit: number): Promise<Entry[]> {
    const entries = this.read()
    if (!entries.length) return []

    const queryEmbedding = await this.embedding.embed(query)

    const scored = entries
      .filter(e => e.embedding && e.embedding.length)
      .map(e => ({
        entry: e,
        score: cosineSimilarity(queryEmbedding, e.embedding)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(e => e.entry)

    return scored
  }
}
