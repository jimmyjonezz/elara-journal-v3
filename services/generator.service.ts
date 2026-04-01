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
    const { recentEntries, state, reflections } = context

    const issues = reflections.flatMap(r => r?.issues ?? [])
    const improvements = reflections.flatMap(r => r?.improvements ?? [])

    const promptData = await this.prompts.getPrompt("generation")

    const avoidBlock = issues.length
      ? `Avoid:\n${issues.join("\n")}`
      : ""

    const improveBlock = improvements.length
      ? `Improve:\n${improvements.join("\n")}`
      : ""

    const insightsBlock = state.insights?.length
      ? `# Learned Insights\n${state.insights.join("\n")}\nDo not repeat them. Build on them.`
      : ""

    const moodBlock = `Mood: ${state.mood.primary} (intensity: ${state.mood.intensity})
${state.mood.secondary.length ? `Secondary: ${state.mood.secondary.join(", ")}` : ""}`

    const stateBlock = `# Internal State
${moodBlock}
Themes: ${state.themes.join(", ")}
Drift: ${state.drift}
Confidence: ${state.confidence}

${insightsBlock}`

    const constraintsBlock = `# Constraints
- Do not repeat structure or phrasing
- High drift → change structure significantly
${avoidBlock}
${improveBlock}`

    const contextBlock = `# Context
Recent entries:
${recentEntries.map(e => e.content.slice(0, 200)).join("\n---\n")}`

    const taskBlock = `# Task
Write the next journal entry.`

    const prompt = this.prompts.render(promptData.template, {
      state: stateBlock,
      constraints: constraintsBlock,
      context: contextBlock,
      Task: taskBlock
    })

    const content = await this.llm.generate(prompt)

    return {
      id: crypto.randomUUID(),
      content,
      createdAt: new Date(),
      embedding: []
    }
  }
}
