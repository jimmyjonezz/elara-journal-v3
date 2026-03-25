import { Reflection } from "../domain/reflection"

export interface Reflector {
  reflect(entry: any, context: any): Promise<Reflection>
}
