// ---------- /services/publisher.service.ts ----------
import { Publisher } from "../interfaces/publisher"
import { Entry } from "../domain/entry"

export class ConsolePublisher implements Publisher {
  async publish(entry: Entry): Promise<void> {
    console.log("Published:", entry.content)
  }
}
