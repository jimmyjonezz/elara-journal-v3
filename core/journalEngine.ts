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
    // --- Context ---
    const context = await this.memory.buildContext()

    // --- Generation ---
    const entry = await this.generator.generate(context)

    if (!entry) {
      throw new Error("Generation failed: empty entry")
    }

    // --- Embedding ---
    const embedding = await this.embedding.embed(entry.content)

    if (!embedding || embedding.length === 0) {
      throw new Error("Embedding failed: empty vector")
    }

    entry.embedding = embedding

    // --- Reflection (ВСЕГДА, если entry существует) ---
    const reflection = await this.reflector.reflect(entry, context)

    // Сохраняем reflection независимо от качества entry
    await this.memory.storeReflection(reflection)

    // --- Evaluation ---
    const evaluation = await this.evaluator.evaluate(entry)

    if (!evaluation.valid) {
      return // entry не сохраняем, но reflection уже сохранён
    }

    // --- Persistence ---
    await this.memory.storeEntry(entry)

    // --- Output ---
    await this.publisher.publish(entry, "console")
  }
}
