// ---------- /services/reflector.service.ts ----------
import { Reflector } from "../interfaces/reflector"
import { Entry } from "../domain/entry"
import { Context } from "../domain/context"
import { Reflection } from "../domain/reflection"

export class MockReflector implements Reflector {
  async reflect(entry: Entry): Promise<Reflection> {
    return {
      id: Math.random().toString(),
      entryId: entry.id,
      analysis: "Reflection",
      selfScore: 0.5,
      createdAt: new Date()
    }
  }
}
