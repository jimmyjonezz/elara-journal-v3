// ---------- /interfaces/reflector.ts ----------
import { Entry } from "../domain/entry"
import { Context } from "../domain/context"
import { Reflection } from "../domain/reflection"

export interface Reflector {
  reflect(entry: Entry, context: Context): Promise<Reflection>
}
