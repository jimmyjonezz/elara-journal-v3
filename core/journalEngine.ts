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

    // --- Crisis injection: если drift >= 0.7, форсируем событие ---
    const crisisEvents = [
      "ТРЕВОГА: система жизнеобеспечения в секторе C выдаёт ошибку — герой вынужден бежать в лабораторный модуль, игнорируя протокол безопасности",
      "НЕОЖИДАННАЯ НАХОДКА: герой находит персональный коммуникатор Дженсена с последней голосовой заметкой за 6 минут до смерти",
      "АВАРИЯ: лёгкое замыкание в распределительном щите сектора 2 — герой тушит и обнаруживает под панелью органическую плёнку",
      "СИГНАЛ: дверь в отсек E герметично закрыта, но карта показывает, что за ней нет помещения — герой взламывает замок"
    ]

    const crisisInjected = state.drift >= 0.7 && context.workingMemory.length > 0

    const workingMemory = crisisInjected
      ? [crisisEvents[Math.floor(Math.random() * crisisEvents.length)], ...context.workingMemory]
      : context.workingMemory

    if (crisisInjected) {
      console.warn(`[CRISIS] Drift=${state.drift.toFixed(2)} — injected forced event: "${workingMemory[0]}"`)
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
