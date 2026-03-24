import { Entry } from "../domain/entry"
import { Reflection } from "../domain/reflection"
import { Context } from "../domain/context"

export interface Memory {
  // последние записи (short-term memory)
  getRecent(limit: number): Promise<Entry[]>

  // семантический поиск (long-term memory)
  searchSemantic(query: string, limit: number): Promise<Entry[]>

  // сохранение записи
  storeEntry(entry: Entry): Promise<void>

  // сохранение рефлексии
  storeReflection(reflection: Reflection): Promise<void>

  // построение контекста для генерации
  buildContext(): Promise<Context>
}
