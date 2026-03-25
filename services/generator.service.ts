import { Generator } from "../interfaces/generator"
import { Context } from "../domain/context"
import { Entry } from "../domain/entry"
import { OllamaClient } from "../infra/llm/ollama.client"
import { FilePromptManager } from "./prompt.service"
import { Memory } from "../interfaces/memory"
import { v4 as uuid } from "uuid"

export class AIGenerator implements Generator {
  constructor(
    private llm: OllamaClient,
    private prompts: FilePromptManager,
    private memory: Memory
  ) {}

  async generate(context: any): Promise<any> {
  const recentEntries = context.recentEntries || []
  const semanticMatches = context.semanticMatches || []

  // --- НОВОЕ ---
  const reflections = await this.memory.getRecentReflections(5)

  const issues = reflections.flatMap(r => r.issues || [])
  const improvements = reflections.flatMap(r => r.improvements || [])

  const prompt = `
You are writing a journal entry.

Context:
- Recent entries: ${recentEntries.map((e: any) => e.content).join("\n")}
- Related memories: ${semanticMatches.map((e: any) => e.content).join("\n")}

Self-improvement constraints:

Avoid repeating these issues:
${issues.join("\n")}

Improve on these aspects:
${improvements.join("\n")}

Write a new journal entry.
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
