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

  async generate(context: Context): Promise<Entry> {
    const { recentEntries, state, reflections, workingMemory } = context

    const lastReflection = reflections[reflections.length - 1]

    // Themes: последние из последнего reflection
    const currentThemesArr = lastReflection?.themes ?? []
    const currentThemes = currentThemesArr.join("\n") || state.themes.join("\n")

    // Known Themes: из self-state (прошлые), без дублирования текущих, макс 2
    const knownThemes = state.themes
      .filter(t => !currentThemesArr.includes(t))
      .slice(0, 2)
      .join("\n")

    // Insights: последние 2 из self-state
    const insights = (state.insights ?? []).slice(-2).join("\n")

    // Dynamic Avoid: истощённые мотивы + issues из ВСЕХ рефлексий (не только последней)
    const motifAvoid = context.exhaustedMotifs?.slice(0, 3).join("\n") ?? ""

    // Собираем issues из всех последних рефлексий, убираем дубликаты
    const allIssues = reflections
      .flatMap(r => (r as any).issues ?? [])
      .filter(Boolean)
    const uniqueIssues = [...new Set(allIssues)]
    const reflectionAvoid = uniqueIssues.slice(-5).join("\n")
    const avoid = [motifAvoid, reflectionAvoid].filter(Boolean).join("\n")

    // Dynamic Improve: макс 5 актуальных из ВСЕХ рефлексий
    const allImprovements = reflections
      .flatMap(r => (r as any).improvements ?? [])
      .filter(Boolean)
    const uniqueImprovements = [...new Set(allImprovements)]
    const improve = uniqueImprovements.slice(-5).join("\n")

    // Recent Entries: только последний абзац предыдущей записи
    const lastEntry = recentEntries[0]?.content ?? ""
    const lastParagraph = lastEntry.split("\n\n").pop() ?? ""

    // Narrative Vector: systemTension из state или fallback из последнего абзаца
    const narrativeVector = (state.systemTension?.[0])
      ?? (lastReflection?.systemTension?.[0])
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

