// ---------- /services/evaluator.service.ts ----------
import { Evaluator, EvaluationResult } from "../interfaces/evaluator"
import { Entry } from "../domain/entry"

export class SimpleEvaluator implements Evaluator {
  async evaluate(entry: Entry): Promise<EvaluationResult> {
    const content = entry.content?.trim() ?? ""

    const isEmpty = content.length < 20
    const isPlaceholder = /^(empty response|error|null|undefined|\[\s*\]|\[\])$/i.test(content)
    const isJunk = !/[а-яА-Я]/.test(content)

    const valid = !isEmpty && !isPlaceholder && !isJunk

    const issues: string[] = []

    if (isEmpty) issues.push("Content too short or empty")
    if (isPlaceholder) issues.push("LLM returned placeholder text")
    if (isJunk) issues.push("Content contains no Russian text")

    return {
      valid,
      score: valid ? 0.8 : 0.1,
      issues
    }
  }
}
