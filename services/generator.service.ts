// services/generator.service.ts

import { Generator } from "../interfaces/generator"
import { Context } from "../domain/context"
import { Entry } from "../domain/entry"
import { SelfState } from "../domain/self-state"
import { OllamaClient } from "../infra/llm/ollama.client"
import { FilePromptManager } from "./prompt.service"

export class AIGenerator implements Generator {
  constructor(
    private llm: OllamaClient,
    private prompts: FilePromptManager
  ) {}

  async generate(
    context: Context & { state: SelfState; reflections: any[] }
  ): Promise<Entry> {
    const { recentEntries, semanticMatches, state, reflections } = context

    const issues = reflections.flatMap(r => r?.issues ?? [])
    const improvements = reflections.flatMap(r => r?.improvements ?? [])

    // Themes: последние из последнего reflection
    const lastReflection = reflections[0]
    const currentThemes = lastReflection?.themes?.join("\n") || state.themes.join(", ")

    // Known Themes: из self-state (прошлые)
    const knownThemes = state.themes.join(", ")

    const template = (await this.prompts.getPrompt("generation")).template

    const prompt = template
      .replace("{{mood}}", state.mood)
      .replace("{{themes}}", currentThemes)
      .replace("{{drift}}", String(state.drift))
      .replace("{{confidence}}", String(state.confidence))
      .replace("{{knownThemes}}", knownThemes)
      .replace("{{insights}}", state.insights?.join("\n") || "")
      .replace("{{recentEntries}}", recentEntries.map(e => e.content.slice(0, 200)).join("\n---\n"))
      .replace("{{avoid}}", issues.join("\n"))
      .replace("{{improve}}", improvements.join("\n"))

    const content = await this.llm.generate(prompt)

    return {
      id: crypto.randomUUID(),
      content,
      createdAt: new Date(),
      embedding: []
    }
  }
}
