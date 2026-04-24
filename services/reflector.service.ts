// services/reflector.service.ts

import { Reflector } from "../interfaces/reflector"
import { Reflection } from "../domain/reflection"
import { randomUUID } from "crypto"
import { extractJSON } from "../utils/json.utils"

export class AIReflector implements Reflector {
  constructor(private llm: any, private prompts: any) {}

  async reflect(entry: any, context: any): Promise<Reflection> {
    const previousThemes = context?.state?.themes?.join("\n") || "(нет предыдущих тем)"

    const template = (await this.prompts.getPrompt("reflection")).template

    const prompt = template
      .replace("<entry>", entry.content)
      .replace("{{themes}}", previousThemes)

    const raw = await this.llm.generate(prompt)

    try {
      const json = extractJSON(raw)
      const parsed = JSON.parse(json)

      return {
        id: randomUUID(),
        entryId: entry.id,
        analysis: raw,

        score: parsed.score ?? 5,
        repetitionScore: parsed.repetitionScore ?? 5,

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
        repetitionScore: 5,

        issues: [],
        improvements: [],
        themes: [],
        newInsights: [],

        createdAt: new Date()
      }
    }
  }
}