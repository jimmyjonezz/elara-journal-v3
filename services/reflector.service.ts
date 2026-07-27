// services/reflector.service.ts

import { Reflector } from "../interfaces/reflector"
import { Reflection } from "../domain/reflection"
import { Entry } from "../domain/entry"
import { Context } from "../domain/context"
import { LLMClient } from "../interfaces/llm"
import { PromptManager } from "../interfaces/prompt"
import { randomUUID } from "crypto"
import { extractJSON } from "../utils/json.utils"

export class AIReflector implements Reflector {
  constructor(private llm: LLMClient, private prompts: PromptManager) {}

  async reflect(entry: Entry, context: Context): Promise<Reflection> {
    const previousThemes = context?.state?.themes?.join("\n") || "(нет предыдущих тем)"
    const currentConfidence = context?.state?.confidence ?? 0.7
    const currentDrift = context?.state?.drift ?? 0.5

    const template = (await this.prompts.getPrompt("reflection")).template

    const prompt = template
      .replace("<entry>", entry.content)
      .replace("{{themes}}", previousThemes)
      .replace("{{confidence}}", String(currentConfidence))
      .replace("{{drift}}", String(currentDrift))

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
        systemTension: parsed.systemTension ?? [],
        abandonedThreads: parsed.abandonedThreads ?? [],

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
        systemTension: [],
        abandonedThreads: [],

        createdAt: new Date()
      }
    }
  }
}