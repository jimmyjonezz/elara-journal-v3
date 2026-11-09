// ---------- /interfaces/generator.ts ----------
import { Context } from "../domain/context"
import { Entry } from "../domain/entry"

export interface Generator {
  generate(context: Context, retryFeedback?: string[]): Promise<Entry>
}
