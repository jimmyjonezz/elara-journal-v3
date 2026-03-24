// ---------- /interfaces/publisher.ts ----------
import { Entry } from "../domain/entry"

export type PublishTarget = "console" | "vk"

export interface Publisher {
  publish(entry: Entry, target: PublishTarget): Promise<void>
}
