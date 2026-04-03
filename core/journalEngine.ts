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

    const entry = await this.generator.generate({
      ...context,
      state,
      reflections
    })

    const embeddingRaw = await this.embedding.embed(entry.content)
      
    if (!embeddingRaw?.length) {
      throw new Error("Embedding failed")
    }
    
    entry.embedding = normalizeEmbedding(embeddingRaw)

    const reflection = await this.reflector.reflect(entry, context)
    const evaluation = await this.evaluator.evaluate(entry)

    if (!evaluation.valid) return

    const newState = updateState(state, reflection)

    await this.memory.storeEntry(entry)
    await this.memory.storeReflection(reflection)
    await this.memory.saveSelfState(newState)

    await this.publisher.publish(entry, "console")
  }
}
