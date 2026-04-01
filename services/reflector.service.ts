// services/reflector.service.ts

import { Reflector } from "../interfaces/reflector"
import { Reflection } from "../domain/reflection"
import { randomUUID } from "crypto"
import { extractJSON } from "../utils/json.utils"

export class AIReflector implements Reflector {
  constructor(private llm: any, private prompts: any) {}

  async reflect(entry: any, context: any): Promise<Reflection> {
    const prompt = `
Проанализируй эту дневниковую запись.

Верни JSON:
{
  "score": оценка от 0 до 10,
  "issues": ["список выявленных проблем и недостатков"],
  "improvements": ["список конкретных рекомендаций по улучшению"],
  "themes": ["список ключевых тем и мотивов записи"],
  "newInsights": ["новые выводы, которые ранее не были очевидны"]
}

ВАЖНО:
- Возвращай только JSON
- newInsights должны содержать только новые наблюдения, не повторяй очевидные вещи

Запись:
${entry.content}
`

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

        createdAt: new Date()
      }
    }
  }
}
