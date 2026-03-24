import fs from "fs"
import path from "path"

import { Memory } from "../interfaces/memory"
import { Entry } from "../domain/entry"
import { cosineSimilarity } from "./vector.utils"
import { EmbeddingService } from "../interfaces/embedding"

export class JsonMemoryService implements Memory {
  private filePath = path.resolve("data/entries.json")

  constructor(private embedding: EmbeddingService) {}

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
    fs.writeFileSync(this.filePath, JSON.stringify(entries, null, 2))
  }

  async getRecent(limit: number): Promise<Entry[]> {
    const entries = this.read()
    return entries
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit)
  }

  async store(entry: Entry): Promise<void> {
    const entries = this.read()
    entries.push(entry)
    this.write(entries)
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
