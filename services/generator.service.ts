// ---------- /services/generator.service.ts ----------
import { Generator } from "../interfaces/generator"
import { Context } from "../domain/context"
import { Entry } from "../domain/entry"
import { OllamaClient } from "../infra/llm/ollama.client"
//import { OpenAIClient } from "../infra/llm/openai.client"
import { FilePromptManager } from "./prompt.service"
import { v4 as uuid } from "uuid"

export class AIGenerator implements Generator {
  constructor(
    private llm: OllamaClient,
    private prompts: FilePromptManager
  ) {}

  async generate(context: Context): Promise<Entry> {
    const prompt = await this.prompts.getPrompt("generation")

    const input = `${prompt.template}
    
    Context:
    ${recent.map(e => e.content).join("\n")}
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
