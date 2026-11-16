// scripts/precalc-seasonal-embeddings.ts
//
// Предрасчёт эмбеддингов сезонных якорей в data/seasonal-embeddings.json.
// Идемпотентно: если poolHash совпадает и все якоря на месте — 0 запросов к API.
// Если пулы изменились — полный пересчёт (63 запроса voyage-4-lite, ~30 c).
//
// Запуск: npx ts-node scripts/precalc-seasonal-embeddings.ts  (нужен VOYAGE_API_KEY)
// В CI вызывается перед main.ts; изменённый файл коммитится вместе с data/*.json.

import * as crypto from "crypto"
import * as fs from "fs"
import * as path from "path"
import { loadSeasonalPools } from "../services/seasonal.service"
import { VoyageClient } from "../infra/llm/voyage.client"

const EMBEDDINGS_PATH = path.resolve("data", "seasonal-embeddings.json")
const POOLS_PATH = path.resolve("data", "seasonal-pools.json")

interface EmbeddingsFile {
  model: string
  dim: number
  inputType: string
  poolHash: string
  anchors: { [text: string]: number[] }
}

function poolHash(): string {
  return crypto
    .createHash("sha256")
    .update(fs.readFileSync(POOLS_PATH))
    .digest("hex")
    .slice(0, 16)
}

function tryLoad(): EmbeddingsFile | null {
  try {
    const parsed = JSON.parse(fs.readFileSync(EMBEDDINGS_PATH, "utf-8"))
    return parsed?.model && parsed?.dim && parsed?.anchors ? (parsed as EmbeddingsFile) : null
  } catch {
    return null
  }
}

async function main(): Promise<void> {
  const model = process.env.VOYAGE_MODEL || "voyage-4-lite"
  const inputType = "document"
  const pools = loadSeasonalPools()

  // уникальные тексты якорей (якорь может повторяться между месяцами)
  const texts = [...new Set(Object.values(pools).flat().map(a => a.text))]
  console.log(`якорей: ${texts.length} | месяцев: ${Object.keys(pools).length}`)

  const existing = tryLoad()
  if (existing && existing.poolHash === poolHash()) {
    const missing = texts.filter(t => !existing.anchors[t]?.length)
    if (!missing.length) {
      console.log(`hash совпадает, все ${texts.length} эмбеддингов на месте — пропуск (0 запросов)`)
      process.exit(0)
    }
    console.log(`hash совпадает, но не хватает ${missing.length} якорей — пересчёт`)
  } else {
    console.log("пулы изменились (или файла нет) — полный пересчёт")
  }

  if (!process.env.VOYAGE_API_KEY) {
    console.error("VOYAGE_API_KEY не задан — невозможно пересчитать эмбеддинги")
    process.exit(1)
  }

  const client = new VoyageClient()
  const anchors: { [text: string]: number[] } = {}
  let dim = 0

  for (let i = 0; i < texts.length; i++) {
    const t = texts[i]
    const vec = await client.embed(t, inputType)
    if (!vec?.length) throw new Error(`пустой эмбеддинг для «${t}»`)
    dim = vec.length
    anchors[t] = vec
    if ((i + 1) % 10 === 0) console.log(`  ${i + 1}/${texts.length}`)
  }

  const out: EmbeddingsFile = { model, dim, inputType, poolHash: poolHash(), anchors }
  fs.writeFileSync(EMBEDDINGS_PATH, JSON.stringify(out, null, 2) + "\n")
  console.log(`записан ${EMBEDDINGS_PATH} | model=${model} dim=${dim} hash=${out.poolHash}`)
}

main().catch(e => {
  console.error("precalc failed:", e?.message || e)
  process.exit(1)
})
