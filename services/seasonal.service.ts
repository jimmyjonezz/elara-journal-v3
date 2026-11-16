// services/seasonal.service.ts
//
// [STAGE 4] Внешний вход: seasonal anchor. Контент живёт в данных:
//   data/seasonal-pools.json        — 63 якоря по месяцам (правятся коммитом в data)
//   data/seasonal-embeddings.json   — предрассчитанные эмбеддинги якорей
// Логика здесь: выбрать якорь по дате и оценить попадание семантикой.
//
// [REFACTOR 2026-11-16] Стем-матчинг (keywords + matchStem) выпилен: на русском
// стемы давали ложные срабатывания (пар→паралич, стол→столько, холод→холодильник),
// и каждый новый корпус требовал правки .ts-файла. Попадание считается косинусом
// между эмбеддингом записи (уже считается для novelty gate — 0 доп. запросов)
// и предрассчитанным эмбеддингом якоря.

import * as fs from "fs"
import * as path from "path"
import { cosineSimilarity } from "../utils/vector.utils"

export interface SeasonalAnchor {
  text: string
}

interface PoolsFile {
  [month: string]: SeasonalAnchor[]
}

// Пути переопределяются через env — тесты и CI-probe гоняют на своих файлах,
// боевое окружение использует data/ по умолчанию.
// ВАЖНО: читаются ЛЕНИВО (в момент вызова), а не на импорте модуля —
// иначе env-override, выставленный тестом после import, не подхватится.
function poolsPath(): string {
  return process.env.SEASONAL_POOLS_PATH || path.resolve("data", "seasonal-pools.json")
}
function embeddingsPath(): string {
  return process.env.SEASONAL_EMBEDDINGS_PATH || path.resolve("data", "seasonal-embeddings.json")
}

let poolsCache: Record<number, SeasonalAnchor[]> | null = null

// для тестов: сброс кэшей между сценариями
export function _resetSeasonalCache(): void {
  poolsCache = null
  embCache = null
}

// [REVIEW: валидатор] Битый data-файл должен валиться громко, а не тихо
// оставлять дневник без якорей.
export function loadSeasonalPools(): Record<number, SeasonalAnchor[]> {
  if (poolsCache) return poolsCache

  const parsed: PoolsFile = JSON.parse(fs.readFileSync(poolsPath(), "utf-8"))
  const pools: Record<number, SeasonalAnchor[]> = {}

  for (const [key, pool] of Object.entries(parsed)) {
    const month = Number(key)
    if (!Number.isInteger(month) || month < 1 || month > 12) {
      throw new Error(`seasonal-pools.json: ключ «${key}» не месяц 1..12`)
    }
    if (!Array.isArray(pool) || !pool.length) {
      throw new Error(`seasonal-pools.json: месяц ${month} пуст или не массив`)
    }
    const seen = new Set<string>()
    for (const item of pool) {
      if (!item?.text || !item.text.trim()) {
        throw new Error(`seasonal-pools.json: пустой text в месяце ${month}`)
      }
      if (seen.has(item.text)) {
        throw new Error(`seasonal-pools.json: дубль «${item.text}» в месяце ${month}`)
      }
      seen.add(item.text)
    }
    pools[month] = pool
  }

  poolsCache = pools
  return pools
}

// Якорь выбирается ДАТОЙ (внешний вход), а не похожестью — иначе это
// скрытый контур обратной связи. Формулу ротации не меняем
// (date.getDate() % pool.length): от неё зависит, какой якорь в какой день
// подавался в shadow-истории, и калибровочный positive control 16.11.
export function getSeasonalAnchor(date = new Date()): SeasonalAnchor {
  const pools = loadSeasonalPools()
  const pool = pools[date.getMonth() + 1] ?? pools[1]
  if (!pool) throw new Error("seasonal-pools.json: нет ни одного месяца")
  return pool[date.getDate() % pool.length]
}

// ---------- Семантическое попадание ----------

export interface AnchorHitResult {
  // hit — якорь присутствует; miss — нет; unavailable — нет эмбеддингов
  // (нет файла, нет вектора якоря или вектора записи). Сбой ≠ промах:
  // unavailable не должен учитываться как miss при подсчёте hit-rate.
  status: "hit" | "miss" | "unavailable"
  score?: number
  model?: string
}

interface EmbeddingsFile {
  model: string
  dim: number
  inputType: string
  poolHash: string
  anchors: { [text: string]: number[] }
}

let embCache: EmbeddingsFile | null = null

export function loadAnchorEmbeddings(): EmbeddingsFile | null {
  if (embCache) return embCache
  try {
    const parsed = JSON.parse(fs.readFileSync(embeddingsPath(), "utf-8"))
    if (parsed?.model && parsed?.dim && parsed?.anchors) {
      embCache = parsed
      return parsed
    }
  } catch {
    // файла нет или битый — unavailable, shadow-режим это переварит
  }
  return null
}

// Порог — КОНСЕРВАТИВНЫЙ, по измеренному шумовому распределению:
// 1575 пар (23 записи × 63 якоря, voyage-4-lite): медиана 0.393, p95 0.474,
// p99 0.498, max 0.521. Реальный positive control (16.11 × «первый лёд в
// луже») = 0.476 — ВНУТРИ шума. Косинус короткий-якорь vs длинная-запись
// не разделяет присутствие темы (предсказание ревью ACPBox подтверждено).
// Поэтому: 0.5 (чуть выше p99) даёт hit только на топ-1% пар; статус
// семантики не является гейтом и не принимается как истина. Рабочий
// наблюдаемый сигнал присутствия — anchorLexicalOverlap.
const PROVISIONAL_THRESHOLD = 0.5

export function anchorHit(
  entryVec: number[] | undefined | null,
  anchor: SeasonalAnchor
): AnchorHitResult {
  if (!entryVec?.length) return { status: "unavailable" }

  const emb = loadAnchorEmbeddings()
  if (!emb) return { status: "unavailable" }

  const anchorVec = emb.anchors[anchor.text]
  if (!anchorVec?.length) {
    // в файле эмбеддингов нет этого якоря — пулы обновили, а precalc не отработал
    console.warn(`[ANCHOR] нет эмбеддинга для «${anchor.text}» — нужен precalc`)
    return { status: "unavailable" }
  }

  const score = cosineSimilarity(entryVec, anchorVec)
  return {
    status: score >= PROVISIONAL_THRESHOLD ? "hit" : "miss",
    score: +score.toFixed(3),
    model: emb.model
  }
}

// Лексическое пересечение (not-verbatim guard): якорь не должен стать
// новым шаблоном, который копируется дословно или почти дословно.
// Считаем долю знаменательных слов якоря, совпавших со словами записи.
//
// [ПОЧЕМУ 3-СИМВОЛЬНЫЕ ПРИставки] Полные словоформы не ловят морфологию:
// «луже» vs «лужу» → 0 при реально присутствующей теме. Префикс 3 символа
// покрывает падежи/спряжения («луж» == «луж»). Ограничение: чередования
// типа лед/льд не ловятся (метрик предупреждающий, не гейт — семантика
// ловится косинусом).
const STOPWORDS_RU = new Set([
  "на", "в", "с", "по", "у", "к", "из", "от", "до", "за", "под", "над", "об", "о", "и", "не", "а", "но", "это", "тот"
])

function prefix3(w: string): string {
  return w.slice(0, 3)
}

export function anchorLexicalOverlap(content: string, anchor: SeasonalAnchor): number {
  const words = anchor.text
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/[^а-я]+/)
    .filter(w => w.length >= 3 && !STOPWORDS_RU.has(w))
    .map(prefix3)
  if (!words.length) return 0

  const text = content
    .toLowerCase()
    .replace(/ё/g, "е")
    .split(/[^а-я]+/)
    .filter(w => w.length >= 3)
    .map(prefix3)
  const textSet = new Set(text)
  const hit = words.filter(p => textSet.has(p)).length
  return +(hit / words.length).toFixed(2)
}
