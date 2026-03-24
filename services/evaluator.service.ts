// ---------- /services/evaluator.service.ts ----------
import { Evaluator, EvaluationResult } from "../interfaces/evaluator"
import { Entry } from "../domain/entry"

export class SimpleEvaluator implements Evaluator {
  async evaluate(entry: Entry): Promise<EvaluationResult> {
    const valid = entry.content.length > 5

    return {
      valid,
      score: valid ? 0.8 : 0.2,
      issues: valid ? [] : ["Too short"]
    }
  }
}
