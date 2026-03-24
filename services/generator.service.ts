// ---------- /services/generator.service.ts ----------
import { Generator } from "../interfaces/generator"
import { Context } from "../domain/context"
import { Entry } from "../domain/entry"

export class MockGenerator implements Generator {
  async generate(context: Context): Promise<Entry> {
    return {
      id: Math.random().toString(),
      content: "Test entry",
      createdAt: new Date(),
      embedding: []
    }
  }
}
