// core/JournalEngine.ts

import { Memory } from "../interfaces/memory"
import { Generator } from "../interfaces/generator"
import { Reflector } from "../interfaces/reflector"
import { Evaluator } from "../interfaces/evaluator"
import { Publisher } from "../interfaces/publisher"
import { EmbeddingService } from "../interfaces/embedding"
import { updateState } from "../services/self-state.service"
import { normalizeEmbedding } from "../utils/embedding.utils"

export class JournalEngine {
  constructor(
    private memory: Memory,
    private generator: Generator,
    private reflector: Reflector,
    private evaluator: Evaluator,
    private publisher: Publisher,
    private embedding: EmbeddingService
  ) {}

  async runCycle(): Promise<void> {
    const context = await this.memory.buildContext()

    const state = await this.memory.getSelfState()
    const reflections = await this.memory.getRecentReflections(5)

    // --- Crisis: если drift >= 0.7, форсируем продолжение последней записи ---
    const lastEntry = context.recentEntries[0]?.content ?? ""
    const sentences = lastEntry
      .split(/\n\n+/)
      .pop() ?? ""
    const lastSentence = sentences
      .split(/[.?!]\s*/)
      .filter(s => s.trim().length > 0)
      .pop() ?? ""

    const needsContinuation = state.drift >= 0.7 && lastSentence.length > 0

    const workingMemory = needsContinuation
      ? [`[FORCED CONTINUATION] "${lastSentence.trim()}" — продолжи ровно с этого момента. Первое слово новой записи = прямое продолжение последнего действия.`, ...context.workingMemory]
      : context.workingMemory

    if (needsContinuation) {
      console.warn(`[CRISIS] Drift=${state.drift.toFixed(2)} — forced continuation from: "${lastSentence.trim()}"`)
    }

    let entry = await this.generator.generate({
      ...context,
      state,
      reflections,
      workingMemory
    })

    let evaluation = await this.evaluator.evaluate(entry)

    for (let attempt = 1; attempt <= 2 && !evaluation.valid; attempt++) {
      console.warn(`Retry ${attempt}:`, evaluation.issues.join("; "))
      entry = await this.generator.generate({
        ...context,
        state,
        reflections,
        workingMemory
      })
      evaluation = await this.evaluator.evaluate(entry)
    }

    if (!evaluation.valid) {
      console.error("Entry rejected after all retries:", evaluation.issues.join("; "))
      return
    }

    const embeddingRaw = await this.embedding.embed(entry.content)
      
    if (!embeddingRaw?.length) {
      throw new Error("Embedding failed")
    }
    
    entry.embedding = normalizeEmbedding(embeddingRaw)

    const reflection = await this.reflector.reflect(entry, context)

    const newState = updateState(state, reflection)

    await this.memory.storeEntry(entry)
    await this.memory.storeReflection(reflection)
    await this.memory.saveSelfState(newState)

    await this.publisher.publish(entry, "console")
  }
}
