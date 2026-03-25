// core/JournalEngine.ts

import { Memory } from "../interfaces/memory"
import { Generator } from "../interfaces/generator"
import { Reflector } from "../interfaces/reflector"
import { Evaluator } from "../interfaces/evaluator"
import { Publisher } from "../interfaces/publisher"
import { EmbeddingService } from "../interfaces/embedding"
import { updateState } from "../services/self-state.service"

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
    // --- Context ---
    const context = await this.memory.buildContext()

    // --- Self State ---
    const state = await this.memory.getSelfState()

    // --- Generation ---
    const entry = await this.generator.generate({
      ...context,
      state
    })

    // --- Embedding ---
    const embedding = await this.embedding.embed(entry.content)

    if (!embedding || embedding.length === 0) {
      throw new Error("Embedding failed: empty vector")
    }

    entry.embedding = embedding

    // --- Reflection ---
    const reflection = await this.reflector.reflect(entry, context)

    // --- Evaluation ---
    const evaluation = await this.evaluator.evaluate(entry)

    if (!evaluation.valid) return

    // --- State Update ---
    const newState = updateState(state, reflection)

    // --- Persistence ---
    await this.memory.storeEntry(entry)
    await this.memory.storeReflection(reflection)
    await this.memory.saveSelfState(newState)

    // --- Output ---
    await this.publisher.publish(entry, "console")
  }
}
