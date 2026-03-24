import { Memory } from "../interfaces/memory"
import { Generator } from "../interfaces/generator"
import { Reflector } from "../interfaces/reflector"
import { Evaluator } from "../interfaces/evaluator"
import { Publisher } from "../interfaces/publisher"
import { EmbeddingService } from "../interfaces/embedding"

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

    const entry = await this.generator.generate(context)

    // --- Embedding (с проверкой) ---
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

    // --- Persistence ---
    await this.memory.storeEntry(entry)
    await this.memory.storeReflection(reflection)

    // --- Output ---
    await this.publisher.publish(entry, "console")
  }
}
