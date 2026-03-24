// ---------- /services/reflector.service.ts ----------
import { Reflector } from "../interfaces/reflector"
import { Entry } from "../domain/entry"
import { Context } from "../domain/context"
import { Reflection } from "../domain/reflection"
import { OpenAIClient } from "../infra/llm/openai.client"
import { FilePromptManager } from "./prompt.service"

export class AIReflector implements Reflector {
  constructor(
    private llm: OpenAIClient,
    private prompts: FilePromptManager
  ) {}

  async reflect(entry: Entry, context: Context): Promise<Reflection> {
    const prompt = await this.prompts.getPrompt("reflection")

    const input = `${prompt.template}\n\n${entry.content}`

    const analysis = await this.llm.generate(input)

    return {
      id: crypto.randomUUID(),
      entryId: entry.id,
      analysis,
      selfScore: 0.5,
      createdAt: new Date()
    }
  }
}
