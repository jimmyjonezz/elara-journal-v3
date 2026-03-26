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

    // ✅ исправлено здесь
    const promptObj = await this.prompts.getPrompt("generation")
    const basePrompt = promptObj.template

    const avoidBlock = issues.length
      ? `Avoid:\n${issues.join("\n")}`
      : ""

    const improveBlock = improvements.length
      ? `Improve:\n${improvements.join("\n")}`
      : ""

    const prompt = `
${basePrompt}

# Internal State
Mood: ${state.mood}
Themes: ${state.themes.join(", ")}
Drift: ${state.drift}
Confidence: ${state.confidence}

# Context
Recent entries:
${recentEntries.map(e => e.content.slice(0, 200)).join("\n---\n")}

# Constraints
- Do not repeat structure or phrasing
- High drift → change structure significantly

${avoidBlock}
${improveBlock}

# Task
Write the next journal entry.
`

    const content = await this.llm.generate(prompt)

    return {
      id: crypto.randomUUID(),
      content,
      createdAt: new Date(),
      embedding: []
    }
  }
}
