// services/memory.service.ts

import * as fs from "fs"
import * as path from "path"

import { Memory } from "../interfaces/memory"
import { Entry } from "../domain/entry"
import { Reflection } from "../domain/reflection"
import { Context } from "../domain/context"
import { EmbeddingService } from "../interfaces/embedding"
import { SelfState } from "../domain/self-state"
import { cosineSimilarity, mmrSelect, MmrCandidate } from "../utils/vector.utils"

export class JsonMemoryService implements Memory {
  private filePath = path.resolve("data/entries.json")
  private reflectionPath = path.resolve("data/reflections.json")
  private selfStatePath = path.resolve("data/self-state.json")
  private embeddingsPath = path.resolve("data/embeddings.json")

  private cache = {
    entries: null as Entry[] | null,
    reflections: null as Reflection[] | null,
    embeddings: null as Record<string, number[]> | null,
    selfState: null as SelfState | null
  }

  constructor(private embedding: EmbeddingService) {}

  // -----------------------
  // Cache helpers
  // -----------------------

  private invalidateCache() {
    this.cache.entries = null
    this.cache.reflections = null
    this.cache.embeddings = null
    this.cache.selfState = null
  }

  // -----------------------
  // Embeddings
  // -----------------------

  private readEmbeddings(): Record<string, number[]> {
    if (this.cache.embeddings) return this.cache.embeddings

    if (!fs.existsSync(this.embeddingsPath)) {
      this.cache.embeddings = {}
      return this.cache.embeddings
    }

    try {
      const raw = JSON.parse(fs.readFileSync(this.embeddingsPath, "utf-8"))

      if (Array.isArray(raw)) {
        const result: Record<string, number[]> = {}
        for (const item of raw) {
          if (item.id && Array.isArray(item.embedding)) {
            result[item.id] = item.embedding
          }
        }
        this.cache.embeddings = result
        return result
      }

      this.cache.embeddings = raw as Record<string, number[]>
      return this.cache.embeddings
    } catch {
      this.cache.embeddings = {}
      return this.cache.embeddings
    }
  }

  private writeEmbeddings(embeddings: Record<string, number[]>) {
    fs.mkdirSync(path.dirname(this.embeddingsPath), { recursive: true })

    const entries = Object.entries(embeddings).map(([id, vector]) => ({
      id,
      embedding: vector
    }))

    const json = JSON.stringify(entries, null, 2)

    const compact = json.replace(
      /"embedding": \[\s*([^\]]+?)\s*\]/g,
      (_, content) => {
        return `"embedding": [${content.replace(/\s+/g, " ")}]`
      }
    )

    fs.writeFileSync(this.embeddingsPath, compact)
    this.cache.embeddings = null
  }

  private setEmbedding(id: string, vector: number[]) {
    const embeddings = this.readEmbeddings()
    embeddings[id] = vector
    this.writeEmbeddings(embeddings)
  }

  // -----------------------
  // Internal helpers
  // -----------------------

  private read(): Entry[] {
    if (this.cache.entries) return this.cache.entries

    if (!fs.existsSync(this.filePath)) {
      this.cache.entries = []
      return this.cache.entries
    }

    try {
      const raw = JSON.parse(fs.readFileSync(this.filePath, "utf-8"))
      const embeddings = this.readEmbeddings()

      const entries: Entry[] = raw.map((e: any) => ({
        id: e.id,
        content: e.content,
        createdAt: new Date(e.createdAt),
        embedding: embeddings[e.id] || []
      }))

      this.cache.entries = entries
      return entries
    } catch {
      this.cache.entries = []
      return []
    }
  }

  private write(entries: Entry[]) {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true })

    const entriesWithoutEmbedding = entries.map(e => ({
      id: e.id,
      content: e.content,
      createdAt: e.createdAt.toISOString()
    }))

    const json = JSON.stringify(entriesWithoutEmbedding, null, 2)
    fs.writeFileSync(this.filePath, json)
    this.cache.entries = null
  }

  private readReflections(): Reflection[] {
    if (this.cache.reflections) return this.cache.reflections

    if (!fs.existsSync(this.reflectionPath)) {
      this.cache.reflections = []
      return []
    }

    try {
      const raw = JSON.parse(fs.readFileSync(this.reflectionPath, "utf-8"))

      const reflections: Reflection[] = raw.map((r: any) => ({
        id: r.id,
        entryId: r.entryId,
        analysis: r.analysis ?? "",
        score: r.score ?? 5,
        repetitionScore: r.repetitionScore ?? 5,
        issues: r.issues ?? [],
        improvements: r.improvements ?? [],
        themes: r.themes ?? [],
        newInsights: r.newInsights ?? [],
        systemTension: r.systemTension ?? [],
        abandonedThreads: r.abandonedThreads ?? [],
        createdAt: new Date(r.createdAt ?? new Date())
      }))

      this.cache.reflections = reflections
      return reflections
    } catch {
      this.cache.reflections = []
      return []
    }
  }

  private writeReflections(reflections: Reflection[]) {
    fs.mkdirSync(path.dirname(this.reflectionPath), { recursive: true })

    const serialized = reflections.map(r => ({
      ...r,
      createdAt: r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : r.createdAt
    }))

    fs.writeFileSync(
      this.reflectionPath,
      JSON.stringify(serialized, null, 2)
    )
    this.cache.reflections = null
  }

  // -----------------------
  // Self state
  // -----------------------

  async getSelfState(): Promise<SelfState> {
    if (this.cache.selfState) return this.cache.selfState

    if (!fs.existsSync(this.selfStatePath)) {
      const initial: SelfState = {
        mood: "calm",
        themes: [],
        insights: [],
        systemTension: [],
        narrativePhase: 1,
        unresolvedThreads: [],
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

      this.cache.selfState = {
        mood: raw.mood || "calm",
        themes: raw.themes || [],
        insights: raw.insights || [],
        systemTension: raw.systemTension || [],
        narrativePhase: raw.narrativePhase ?? 1,
        unresolvedThreads: raw.unresolvedThreads || [],
        drift: raw.drift ?? 0.3,
        confidence: raw.confidence ?? 0.5
      }

      return this.cache.selfState

    } catch {
      this.cache.selfState = {
        mood: "calm",
        themes: [],
        insights: [],
        systemTension: [],
        narrativePhase: 1,
        unresolvedThreads: [],
        drift: 0.3,
        confidence: 0.5
      }
      return this.cache.selfState
    }
  }

  async saveSelfState(state: SelfState): Promise<void> {
    fs.mkdirSync(path.dirname(this.selfStatePath), { recursive: true })

    fs.writeFileSync(
      this.selfStatePath,
      JSON.stringify(state, null, 2)
    )
    this.cache.selfState = state
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
    const all = this.readReflections()
    return all
      .sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .slice(0, limit)
  }

  async storeEntry(entry: Entry): Promise<void> {
    const entries = this.read()

    if (entry.embedding?.length) {
      this.setEmbedding(entry.id, entry.embedding)
    }

    entries.push(entry)
    entries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    this.write(entries)
  }

  async storeReflection(reflection: Reflection): Promise<void> {
    const reflections = this.readReflections()
    reflections.push(reflection)
    reflections.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    this.writeReflections(reflections)
  }

  // -----------------------
  // Semantic search
  // -----------------------

  private queryCache = new Map<string, { result: Entry[]; timestamp: number }>()
  private readonly CACHE_TTL = 60000

  async searchSemantic(query: string, limit: number): Promise<Entry[]> {
    const entries = this.read()
    if (!entries.length) return []

    const now = Date.now()
    const cached = this.queryCache.get(query)
    if (cached && now - cached.timestamp < this.CACHE_TTL) {
      return cached.result.slice(0, limit)
    }

    const queryEmbedding = await this.embedding.embed(query)

    const result = entries
      .filter(e => e.embedding?.length)
      .map(e => ({
        entry: e,
        score: cosineSimilarity(queryEmbedding, e.embedding)
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(e => e.entry)

    this.queryCache.set(query, { result, timestamp: now })

    return result
  }

  // -----------------------
  // Context
  // -----------------------

  async buildContext(): Promise<Context> {
    const recentEntries = await this.getRecent(5)
    const reflections = await this.getRecentReflections(3)
    const state = await this.getSelfState()

    // [STAGE 4] Далёкие эхо: MMR поверх всех записей, исключая последние 5.
    // До этого: searchSemantic(query=последняя запись, 3) → сама запись
    // (cos=1.0) + соседи = усиление аттрактора.
    let distantEchoes: Entry[] = []
    if (recentEntries.length > 0) {
      const excludeIds = new Set(recentEntries.map(e => e.id))
      distantEchoes = await this.getDistantEchoes(recentEntries[0].id, 3, excludeIds)
    }

    return {
      recentEntries,
      distantEchoes,
      reflections,
      state,
      workingMemory: state.unresolvedThreads.slice(0, 3),
      exhaustedMotifs: []
    }
  }

  // [STAGE 4] MMR-выборка далёких по содержанию записей
  async getDistantEchoes(
    queryEntryId: string,
    limit: number,
    excludeIds: Set<string>
  ): Promise<Entry[]> {
    const entries = this.read()
    if (entries.length === 0) return []

    const queryEntry = entries.find(e => e.id === queryEntryId)
    if (!queryEntry?.embedding?.length) return []

    // пул: всё, что не исключено и имеет embedding
    const candidates: MmrCandidate<Entry>[] = entries
      .filter(e => e.embedding?.length && !excludeIds.has(e.id))
      .map(e => ({ item: e, vector: e.embedding }))

    return mmrSelect(queryEntry.embedding, candidates, limit, 0.3)
  }
}
