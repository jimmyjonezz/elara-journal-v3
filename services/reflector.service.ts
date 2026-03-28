// services/reflector.service.ts

import { Reflector } from "../interfaces/reflector"
import { Reflection } from "../domain/reflection"
import { randomUUID } from "crypto"

export class AIReflector implements Reflector {
  constructor(private llm: any, private prompts: any) {}

  async reflect(entry: any, context: any): Promise<Reflection> {
    const prompt = `
Проанализируй эту дневниковую запись.

Верни JSON:
{
  "score": число (0-10),
  "issues": массив строк,
  "improvements": массив строк,
  "themes": массив строк
}

Запись:
${entry.content}
`

    const raw = await this.llm.generate(prompt)

    try {
      const parsed = JSON.parse(raw)

      return {
        id: randomUUID(),
        entryId: entry.id,
        analysis: raw,

        score: parsed.score ?? 5,

        issues: parsed.issues ?? [],
        improvements: parsed.improvements ?? [],
        themes: parsed.themes ?? [],
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
        createdAt: new Date()
      }
    }
  }
}
