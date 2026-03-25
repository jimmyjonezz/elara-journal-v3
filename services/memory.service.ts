import * as fs from "fs"
import * as path from "path"

// Импорт интерфейсов и типов
import { Memory } from "../interfaces/memory"
import { Entry } from "../domain/entry"
import { Reflection } from "../domain/reflection"
import { Context } from "../domain/context"
import { EmbeddingService } from "../interfaces/embedding"
import { cosineSimilarity } from "./vector.utils"

export class JsonMemoryService implements Memory {
  private filePath = path.resolve("data/entries.json")
  private reflectionPath = path.resolve("data/reflections.json")

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

  let json = JSON.stringify(entries, null, 2)

  // Сжимаем embedding в одну строку
  json = json.replace(
    /"embedding": \[\s+([^\]]+?)\s+\]/g,
    (_, inner) => {
      const compact = inner
        .split(",")
        .map(s => s.trim())
        .join(", ")
      return `"embedding": [${compact}]`
    }
  )

  fs.writeFileSync(this.filePath, json)
  }

  private readReflections(): Reflection[] {
    if (!fs.existsSync(this.reflectionPath)) return []
    return JSON.parse(fs.readFileSync(this.reflectionPath, "utf-8"))
  }

  private writeReflections(reflections: Reflection[]) {
    fs.mkdirSync(path.dirname(this.reflectionPath), { recursive: true })
    fs.writeFileSync(this.reflectionPath, JSON.stringify(reflections, null, 2))
  }

  // ==================== PUBLIC INTERFACE ====================

  async getRecent(limit: number): Promise<Entry[]> {
    const entries = this.read()
    return entries
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  async getRecentReflections(limit: number): Promise<any[]> {
  const data = await this.readReflections()
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
