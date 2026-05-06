// services/generator.service.ts

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

  async generate(
    context: Context & { state: SelfState; reflections: any[] }
  ): Promise<Entry> {
    const { recentEntries, semanticMatches, state, reflections } = context

    const lastReflection = reflections[0]

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

    // Dynamic Avoid: макс 2 актуальных из последнего reflection
    const avoid = (lastReflection?.issues ?? []).slice(-2).join("\n")

    // Dynamic Improve: макс 2 актуальных из последнего reflection
    const improve = (lastReflection?.improvements ?? []).slice(-2).join("\n")

    // Recent Entries: только последний абзац предыдущей записи
    const lastEntry = recentEntries[0]?.content ?? ""
    const lastParagraph = lastEntry.split("\n\n").pop() ?? ""

    // Narrative Vector: systemTension из state или fallback из последнего абзаца
    const narrativeVector = (state.systemTension?.[0])
      ?? (lastReflection?.systemTension?.[0])
      ?? lastParagraph.split(".").pop()?.trim() ?? ""

    const template = (await this.prompts.getPrompt("generation")).template

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

    const content = await this.llm.generate(prompt)

    return {
      id: crypto.randomUUID(),
      content,
      createdAt: new Date(),
      embedding: []
    }
  }
}

