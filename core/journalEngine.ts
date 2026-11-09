// core/JournalEngine.ts

import { Memory } from "../interfaces/memory"
import { Generator } from "../interfaces/generator"
import { Reflector } from "../interfaces/reflector"
import { Evaluator } from "../interfaces/evaluator"
import { Publisher } from "../interfaces/publisher"
import { EmbeddingService } from "../interfaces/embedding"
import { updateState } from "../services/self-state.service"
import { normalizeEmbedding } from "../utils/embedding.utils"
import { cosineSimilarity } from "../utils/vector.utils"
import { checkConsequences } from "../services/evaluator.service"
import { MotifTracker } from "../services/motif.service"

export class JournalEngine {
  private motifTracker = new MotifTracker()
  private backfilled = false

  constructor(
    private memory: Memory,
    private generator: Generator,
    private reflector: Reflector,
    private evaluator: Evaluator,
    private publisher: Publisher,
    private embedding: EmbeddingService
  ) {}

  // [STAGE 1] Novelty gate: косинусное сходство с предыдущими 3 записями.
  // Порог 0.90 калиброван на корпусе из 22 записей: mean=0.858, σ≈0.04,
  // все 21 соседняя пара >0.75 (дневник однороден по природе), а 0.90 ловит
  // только патологический хвост (08-12: 0.928, 08-13: 0.914, 08-11: 0.919).
  private static readonly SIMILARITY_GATE = 0.90

  async runCycle(): Promise<void> {
    const context = await this.memory.buildContext()

    const state = await this.memory.getSelfState()
    const reflections = await this.memory.getRecentReflections(5)

    // --- Backfill мотивов из существующих записей (один раз) ---
    if (!this.backfilled) {
      const allEntries = await this.memory.getRecent(500)
      this.motifTracker.backfill(allEntries)
      this.backfilled = true
    }

    // --- Истощённые мотивы для {{avoid}} ---
    context.exhaustedMotifs = this.motifTracker.getExhaustedMotifs()

    // [STAGE 3] Crisis FORCED CONTINUATION убран: продолжение последнего
    // предложения — механический повтор, худший вид петли. drift>=0.7 теперь
    // влияет только на голос (voice-phases), а не на структуру записи.
    const workingMemory = context.workingMemory

    // [STAGE 1] Замер подобия кандидата: embedding + cosine к предыдущим 3
    const recentVecs = context.recentEntries
      .slice(0, 3)
      .map(e => e.embedding)
      .filter((v): v is number[] => Array.isArray(v) && v.length > 0)

    const checkNovelty = async (text: string): Promise<{ vec: number[]; issue: string | null }> => {
      const raw = await this.embedding.embed(text)
      if (!raw?.length) throw new Error("Embedding failed")
      const vec = normalizeEmbedding(raw)
      if (!recentVecs.length) return { vec, issue: null }
      const maxCos = Math.max(
        ...recentVecs.map(v => cosineSimilarity(vec, v))
      )
      if (maxCos >= JournalEngine.SIMILARITY_GATE) {
        return {
          vec,
          issue: `Запись слишком похожа на предыдущие (cos=${maxCos.toFixed(3)} ≥ ${JournalEngine.SIMILARITY_GATE}) — нужны другие образы и сцена`
        }
      }
      return { vec, issue: null }
    }

    let entry = await this.generator.generate({
      ...context,
      state,
      reflections,
      workingMemory
    })

    let evaluation = await this.evaluator.evaluate(entry)
    let novelty = await checkNovelty(entry.content)

    // Проверка последствий
    const prevEntry = context.recentEntries[0] ?? null
    const applyConsequence = () => {
      const consequenceIssue = checkConsequences(entry, prevEntry)
      if (consequenceIssue) {
        evaluation.issues.push(consequenceIssue)
        evaluation.valid = false
      }
    }
    applyConsequence()
    if (novelty.issue) {
      evaluation.issues.push(novelty.issue)
      evaluation.valid = false
    }

    // [STAGE 1] Ретраи Income с обратной связью: проблемы предыдущей попытки
    // попадают в workingMemory, а не слепо повторяется тот же промпт
    for (let attempt = 1; attempt <= 2 && !evaluation.valid; attempt++) {
      const feedback = evaluation.issues.map(i => `[RETRY FEEDBACK] ${i}`)
      console.warn(`Retry ${attempt}:`, evaluation.issues.join("; "))
      entry = await this.generator.generate({
        ...context,
        state,
        reflections,
        workingMemory: [...feedback, ...workingMemory]
      })
      evaluation = await this.evaluator.evaluate(entry)
      novelty = await checkNovelty(entry.content)
      applyConsequence()
      if (novelty.issue) {
        evaluation.issues.push(novelty.issue)
        evaluation.valid = false
      }
    }

    // [STAGE 1] Молчаливый return убран: rejection роняет процесс (exit 1 в main.ts),
    // чтобы CI не коммитил «No changes» 80 дней при зелёных сборках
    if (!evaluation.valid) {
      throw new Error(
        "Entry rejected after all retries: " + evaluation.issues.join("; ")
      )
    }

    entry.embedding = novelty.vec

    // [STAGE 3] Измеренный сигнал повторения → drift (вместо LLM self-report)
    const recentCos = recentVecs.length
      ? Math.max(...recentVecs.map(v => cosineSimilarity(novelty.vec, v)))
      : undefined

    const reflection = await this.reflector.reflect(entry, context)

    const newState = updateState(state, reflection, recentCos)

    await this.memory.storeEntry(entry)
    await this.memory.storeReflection(reflection)
    await this.memory.saveSelfState(newState)

    // --- Сканируем запись на истощённые мотивы ---
    this.motifTracker.scanEntryWithReflection(entry)
    this.motifTracker.save()

    await this.publisher.publish(entry, "console")

    // [STAGE 1] Health check: успешный цикл обязан добавить запись за сегодня
    const after = await this.memory.getRecent(1)
    const today = new Date().toDateString()
    if (!after[0] || after[0].createdAt.toDateString() !== today) {
      throw new Error("Health check: запись за сегодня не добавлена — цикл прошёл, но данных нет")
    }
  }
}
