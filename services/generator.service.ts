// generator.service.ts
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

  private unique(arr: string[]): string[] {
    return [...new Set(arr)]
  }

  async generate(context: any): Promise<any> {
    const recentEntries = context.recentEntries || []
    const semanticMatches = context.semanticMatches || []

    const reflections = await this.memory.getRecentReflections(5)

    // --- FIX 1: дедупликация ---
    const issues = this.unique(
      reflections.flatMap(r => r.issues || [])
    ).slice(0, 5)

    const improvements = this.unique(
      reflections.flatMap(r => r.improvements || [])
    ).slice(0, 5)

    // --- FIX 2: variability ---
    const modes = ["minimal", "structured", "narrative", "analytical"]
    const mode = modes[Math.floor(Math.random() * modes.length)]

    const prompt = `
Mode: ${mode}

Context:
Recent entries (do NOT repeat their structure or patterns):
${recentEntries.map((e: any) => e.content.slice(0, 200)).join("\n---\n")}

Constraints:
- Do not reuse the same structure as recent entries
- Avoid repeating similar scenarios
- Keep the entry distinct

Self-improvement signals (use lightly, do not overfit):

Avoid:
${issues.join("\n")}

Improve:
${improvements.join("\n")}

Write a new, distinct journal entry.
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
