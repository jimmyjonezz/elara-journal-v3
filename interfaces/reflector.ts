import { Reflection } from "./reflection"

export interface Reflector {
  reflect(entry: any, context: any): Promise<Reflection>
}
