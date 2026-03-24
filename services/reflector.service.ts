// ---------- /services/reflector.service.ts ----------
import { Reflector } from "../interfaces/reflector"
import { Entry } from "../domain/entry"
import { Context } from "../domain/context"
import { Reflection } from "../domain/reflection"
//import { OpenAIClient } from "../infra/llm/openai.client"
import { FilePromptManager } from "./prompt.service"
import { OllamaClient } from "../infra/llm/ollama.client"
import { v4 as uuid } from "uuid"

export class AIReflector implements Reflector {
  constructor(
    private llm: OllamaClient,
    private prompts: FilePromptManager
  ) {}

  async reflect(entry: Entry, context: Context): Promise<Reflection> {
    const prompt = await this.prompts.getPrompt("reflection")

    const input = `${prompt.template}\n\n${entry.content}`

    const analysis = await this.llm.generate(input)

    return {
      id: uuid(),
      entryId: entry.id,
      analysis,
      selfScore: 0.5,
      createdAt: new Date()
    }
  }
}
