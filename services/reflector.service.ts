// services/reflector.service.ts

import { Reflector } from "../interfaces/reflector"
import { Reflection } from "../domain/reflection"
import { randomUUID } from "crypto"
import { extractJSON } from "../utils/json.utils"
import { FilePromptManager } from "./prompt.service"

export class AIReflector implements Reflector {
  constructor(
    private llm: any,
    private prompts: FilePromptManager
  ) {}

  async reflect(entry: any, context: any): Promise<Reflection> {
    const promptData = await this.prompts.getPrompt("reflection")

    const outputFormat = `Верни JSON:
{
  "score": оценка от 0 до 10,
  "issues": ["список выявленных проблем и недостатков"],
  "improvements": ["список конкретных рекомендаций по улучшению"],
  "themes": ["список ключевых тем и мотивов записи"],
  "newInsights": ["новые выводы, которые ранее не были очевидны"],
  "secondary": ["оттенки настроения: дополнительные эмоции или состояния, уточняющие основное"]
}

ВАЖНО:
- Возвращай только JSON
- newInsights должны содержать только новые наблюдения, не повторяй очевидные вещи
- secondary: добавь если текст содержит оттенки настроения (ностальгия, теплота, тревога и т.п.)`

    const prompt = this.prompts.render(promptData.template, {
      output_format: outputFormat,
      entry: entry.content
    })

    const raw = await this.llm.generate(prompt)

    try {
      const json = extractJSON(raw)
      const parsed = JSON.parse(json)

      return {
        id: randomUUID(),
        entryId: entry.id,
        analysis: raw,

        score: parsed.score ?? 5,

        issues: parsed.issues ?? [],
        improvements: parsed.improvements ?? [],
        themes: parsed.themes ?? [],
        newInsights: parsed.newInsights ?? [],
        secondary: parsed.secondary ?? [],

        createdAt: new Date()
      }

    } catch {
      return {
        id: randomUUID(),
        entryId: entry.id,
        analysis: raw,

        score: 5,

        issues: [],
        improvements: [],
        themes: [],
        newInsights: [],
        secondary: [],

        createdAt: new Date()
      }
    }
  }
}
