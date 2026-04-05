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

    const template = (await this.prompts.getPrompt("generation")).template

    const prompt = template
      .replace("{{mood}}", state.mood)
      .replace("{{themes}}", state.themes.join(", "))
      .replace("{{drift}}", String(state.drift))
      .replace("{{confidence}}", String(state.confidence))
      .replace("{{knownThemes}}", state.themes.join(", "))
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
