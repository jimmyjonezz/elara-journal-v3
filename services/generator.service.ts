// services/generator.service.ts

import { randomUUID } from "crypto"
import { Generator } from "../interfaces/generator"
import { Context } from "../domain/context"
import { Entry } from "../domain/entry"
import { SelfState } from "../domain/self-state"
import { LLMClient } from "../interfaces/llm"
import { FilePromptManager } from "./prompt.service"

export class AIGenerator implements Generator {
  constructor(
    private llm: LLMClient,
    private prompts: FilePromptManager
  ) {}

  async generate(context: Context, retryFeedback?: string[]): Promise<Entry> {
    const { recentEntries, distantEchoes, state, reflections, workingMemory } = context

    const lastReflection = reflections[0] ?? reflections[reflections.length - 1]

    // Themes: последние из последнего reflection
    const currentThemesArr = lastReflection?.themes ?? []
    const currentThemes = currentThemesArr.join("\n") || state.themes.slice(-3).join("\n")

    // Known Themes: последние 2 (раньше slice(0,2) — самые протухшие),
    // фильтруем против ЭФФЕКТИВНЫХ текущих тем, а не только reflection
    const effectiveThemes = currentThemes.split("\n").map(t => t.trim())
    const knownThemes = state.themes
      .filter(t => !effectiveThemes.includes(t.trim()))
      .slice(-2)
      .join("\n")

    // Insights: последние 2 из self-state
    const insights = (state.insights ?? []).slice(-2).join("\n")

    // [STAGE 4] REBALANCING: avoid 8→3, improve 5→2.
    // 18/22 мотивов exhausted → 8 строкavoid = прайминг названиями
    // образов (соль/старушка/К), а остальные каналы тонули в шуме
    const motifAvoid = context.exhaustedMotifs?.slice(0, 3).join("\n") ?? ""

    const allIssues = reflections
      .flatMap(r => (r as any).issues ?? [])
      .filter(Boolean)
    const uniqueIssues = [...new Set(allIssues)]
    const reflectionAvoid = uniqueIssues.slice(-1).join("\n")
    const avoid = [motifAvoid, reflectionAvoid].filter(Boolean).join("\n")

    // Dynamic Improve: макс 2
    const allImprovements = reflections
      .flatMap(r => (r as any).improvements ?? [])
      .filter(Boolean)
    const uniqueImprovements = [...new Set(allImprovements)]
    const improve = uniqueImprovements.slice(-2).join("\n")

    // Distant Echoes [STAGE 4]: MMR-выбранные далёкие записи,
    // выдержки по 2 предложения — не полные мегабайты
    const echoExcerpts = (distantEchoes ?? [])
      .map(e => {
        const sentences = e.content?.split(/(?<=[.?!])\s+/).slice(0, 2).join(" ") ?? ""
        return `(${e.createdAt ? new Date(e.createdAt).toLocaleDateString("ru-RU") : "?"}) ${sentences}`
      })
      .join("\n")

    // Recent Entries: только последний абзац предыдущей записи
    const lastEntry = recentEntries[0]?.content ?? ""
    const lastParagraph = lastEntry.split("\n\n").pop() ?? ""

    // Narrative Vector: systemTension из state или fallback из последнего абзаца
    const latestSystemTension = state.systemTension?.length
      ? state.systemTension[state.systemTension.length - 1]
      : null
    const latestReflectionTension = lastReflection?.systemTension?.length
      ? lastReflection.systemTension[lastReflection.systemTension.length - 1]
      : null
    const narrativeVector = latestSystemTension
      ?? latestReflectionTension
      ?? lastParagraph.split(".").pop()?.trim() ?? ""

    const template = (await this.prompts.getPrompt("generation")).template

    // Voice phase: извлекаем секцию для текущей фазы
    const phase = state.narrativePhase ?? 1
    const voiceRaw = (await this.prompts.getPrompt("voice-phases")).template
    const phaseMatch = voiceRaw.match(
      new RegExp(`### FASE ${phase}:.*?(?=\n### FASE |\n$)`, "s")
    )
    const voicePhase = phaseMatch?.[0]?.trim() ?? ""

    const prompt = template
      .replace("{{mood}}", state.mood)
      .replace("{{themes}}", currentThemes)
      .replace("{{drift}}", String(state.drift))
      .replace("{{confidence}}", String(state.confidence))
      .replace("{{knownThemes}}", knownThemes)
      .replace("{{insights}}", insights)
      .replace("{{recentEntries}}", lastParagraph)
      .replace("{{avoid}}", avoid)
      .replace("{{improve}}", improve)
      .replace("{{narrativeVector}}", narrativeVector)
      .replace("{{workingMemory}}", workingMemory.join("\n") || "None")
      .replace("{{voicePhase}}", voicePhase)
      // [STAGE 4] внешний якорь + далёкие эхо + retry-канал
      .replace("{{seasonalAnchor}}", context.seasonalAnchor?.text ?? "")
      .replace("{{distantEchoes}}", echoExcerpts || "None")
      .replace("{{retryFeedback}}", (retryFeedback ?? []).join("\n") || "None")

    // H: Динамическая температура на основе confidence
    // Низкий confidence → выше температура (больше случайности, шанс выйти из цикла)
    const tempConf = state.confidence ?? 0.7
    const llmOptions = {
      temperature: tempConf > 0.8 ? 0.7 : tempConf > 0.7 ? 0.85 : tempConf > 0.6 ? 1.0 : 1.2,
      top_p: tempConf > 0.8 ? 0.8 : tempConf > 0.7 ? 0.85 : tempConf > 0.6 ? 0.9 : 0.95
    }

    const content = await this.llm.generate(prompt, llmOptions)

    return {
      id: crypto.randomUUID(),
      content,
      createdAt: new Date(),
      embedding: []
    }
  }
}

