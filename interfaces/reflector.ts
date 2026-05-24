import { Reflection } from "../domain/reflection"
import { Entry } from "../domain/entry"
import { Context } from "../domain/context"

export interface Reflector {
  reflect(entry: Entry, context: Context): Promise<Reflection>
}
