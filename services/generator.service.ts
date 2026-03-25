// services/generator.service.ts

import { Generator } from "../interfaces/generator"
import { Context } from "../domain/context"
import { Entry } from "../domain/entry"
import { OllamaClient } from "../infra/llm/ollama.client"
import { FilePromptManager } from "./prompt.service"
import { Memory } from "../interfaces/memory"

export class AIGenerator implements Generator {
  constructor(
    private llm: OllamaClient,
    private prompts: FilePromptManager,
    private memory: Memory
  ) {}

  async generate(context: Context & { state: any }): Promise<Entry> {
    const recentEntries = context.recentEntries || []
    const semanticMatches = context.semanticMatches || []
    const state = context.state

    const reflections = await this.memory.getRecentReflections(5)

    const issues = reflections.flatMap(r => r.issues || [])
    const improvements = reflections.flatMap(r => r.improvements || [])

    // --- base prompt из файла ---
    const basePrompt = this.prompts.get("journal")

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

Related memories:
${semanticMatches.map(e => e.content.slice(0, 200)).join("\n---\n")}

# Constraints
- Do not repeat structure or phrasing from recent entries
- If drift is high → change structure significantly
- Keep the entry concise

# Self-Improvement Signals (use lightly)
Avoid:
${issues.join("\n")}

Improve:
${improvements.join("\n")}

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
