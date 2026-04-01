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

export class JsonMemoryService implements Memory {
  private filePath = path.resolve("data/entries.json")
  private reflectionPath = path.resolve("data/reflections.json")
  private selfStatePath = path.resolve("data/self-state.json")
  private embeddingsPath = path.resolve("data/embeddings.json")

  constructor(private embedding: EmbeddingService) {}

  // -----------------------
  // Internal helpers
  // -----------------------

  private readEmbeddings(): Record<string, number[]> {
    if (!fs.existsSync(this.embeddingsPath)) return {}

    try {
      return JSON.parse(fs.readFileSync(this.embeddingsPath, "utf-8"))
    } catch {
      return {}
    }
  }

  private writeEmbeddings(embeddings: Record<string, number[]>): void {
    fs.mkdirSync(path.dirname(this.embeddingsPath), { recursive: true })

    const compact: Record<string, string> = {}
    for (const [id, vec] of Object.entries(embeddings)) {
      compact[id] = `[${vec.join(", ")}]`
    }

    const json = JSON.stringify(compact, null, 2)
      .replace(/"\[/g, "[")
      .replace(/\]"/g, "]")

    fs.writeFileSync(this.embeddingsPath, json)
  }

  private read(): Entry[] {
    if (!fs.existsSync(this.filePath)) return []

    try {
      const raw = JSON.parse(fs.readFileSync(this.filePath, "utf-8"))
      const storedEmbeddings = this.readEmbeddings()

      return raw.map((e: any) => ({
        ...e,
        createdAt: new Date(e.createdAt),
        embedding: storedEmbeddings[e.id] || e.embedding || []
      }))
    } catch {
      return []
    }
  }

  private write(entries: Entry[]): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true })

    const entriesWithoutEmbedding = entries.map((e: Entry) => {
      const { embedding, ...rest } = e as any
      return rest
    })

    fs.writeFileSync(
      this.filePath,
      JSON.stringify(entriesWithoutEmbedding, null, 2)
    )
  }

  private saveEmbedding(id: string, embedding: number[]): void {
    const embeddings = this.readEmbeddings()
    if (embedding.length) {
      embeddings[id] = embedding
      this.writeEmbeddings(embeddings)
    }
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
        mood: {
          primary: "calm",
          secondary: [],
          intensity: 0.5
        },
        themes: [],
        insights: [],
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

      const mood = typeof raw.mood === "string"
        ? { primary: "calm" as const, secondary: [], intensity: 0.5 }
        : {
            primary: raw.mood?.primary || "calm",
            secondary: raw.mood?.secondary || [],
            intensity: raw.mood?.intensity ?? 0.5
          }

      return {
        mood,
        themes: raw.themes || [],
        insights: raw.insights || [],
        drift: raw.drift ?? 0.3,
        confidence: raw.confidence ?? 0.5
      }

    } catch {
      return {
        mood: {
          primary: "calm",
          secondary: [],
          intensity: 0.5
        },
        themes: [],
        insights: [],
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

    if (entry.embedding?.length) {
      this.saveEmbedding(entry.id, entry.embedding)
    }
  }

  async storeReflection(reflection: Reflection): Promise<void> {
    const reflections = this.readReflections()
    reflections.push(reflection)
    this.writeReflections(reflections)
  }

  // -----------------------
  // Semantic search
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

  // -----------------------
  // Context
  // -----------------------

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
