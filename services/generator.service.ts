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

  async generate(context: Context): Promise<Entry> {
    const prompt = await this.prompts.getPrompt("generation")

    const recent = context.recentEntries || []

    // semantic search (используем последние записи как запрос)
    const semantic = await this.memory.searchSemantic(
      recent.map(e => e.content).join("\n"),
      3
    )

    const input = `
${prompt.template}

Recent:
${recent.map(e => e.content).join("\n")}

Relevant past:
${semantic.map(e => e.content).join("\n")}
`

    const content = await this.llm.generate(input)

    return {
      id: uuid(),
      content,
      createdAt: new Date(),
      embedding: []
    }
  }
}
