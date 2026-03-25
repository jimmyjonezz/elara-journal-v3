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

    // generator.service.ts
const state = await this.memory.getSelfState()

const prompt = `
${basePrompt}

# Internal State
Mood: ${state.mood}
Themes: ${state.themes.join(", ")}
Drift: ${state.drift}
Confidence: ${state.confidence}

# Instructions
- Adjust tone based on mood
- If drift is high → change structure significantly
- If confidence is low → experiment more
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
