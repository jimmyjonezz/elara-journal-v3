// ---------- /interfaces/evaluator.ts ----------
import { Entry } from "../domain/entry"

export type EvaluationResult = {
  valid: boolean
  score: number
  issues: string[]
}
