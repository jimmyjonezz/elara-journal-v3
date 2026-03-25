import { Reflector } from "../interfaces/reflector"
import { Reflection } from "../interfaces/reflection"

export class AIReflector implements Reflector {
  constructor(private llm: any, private prompts: any) {}

  async reflect(entry: any, context: any): Promise<Reflection> {
    const prompt = `
Analyze the following journal entry.

Return JSON:
{
  "score": 0-10,
  "issues": [],
  "improvements": [],
  "themes": []
}

Entry:
${entry.content}
`

    const raw = await this.llm.generate(prompt)

    try {
      const parsed = JSON.parse(raw)

      return {
        entryId: entry.id,
        score: parsed.score ?? 5,
        issues: parsed.issues ?? [],
        improvements: parsed.improvements ?? [],
        themes: parsed.themes ?? []
      }
    } catch {
      return {
        entryId: entry.id,
        score: 5,
        issues: [],
        improvements: [],
        themes: []
      }
    }
  }
}
