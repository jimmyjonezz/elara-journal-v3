// Тест стадии 4: MMR vs top-3, seasonal anchor, rebalancing
import * as fs from "fs"
import * as path from "path"
import { mmrSelect, cosineSimilarity, MmrCandidate } from "../utils/vector.utils"
import { getSeasonalAnchor, anchorHit } from "../services/seasonal.service"
import { Entry } from "../domain/entry"

const dataDir = "/data/data/com.termux/files/home/elara-journal-v3/data"
const entries: (Entry & { embedding?: number[] })[] = JSON.parse(
  fs.readFileSync(path.join(dataDir, "embeddings.json"), "utf-8")
).map((e: any) => ({ ...e, createdAt: new Date(0) }))
const contents: Record<string, string> = {}
for (const e of JSON.parse(fs.readFileSync(path.join(dataDir, "entries.json"), "utf-8")) as any[]) {
  contents[e.id] = e.content
}
for (const e of entries) (e as any).content = contents[e.id] ?? ""

console.log("=== 1. MMR vs naive top-3 ===")
const queryEntry = entries[0]
const queryVec = queryEntry.embedding!
const candidates: MmrCandidate<any>[] = entries
  .filter(e => e.id !== queryEntry.id && e.embedding?.length)
  .map(e => ({ item: e, vector: e.embedding! }))

const mmrPicks = mmrSelect(queryVec, candidates, 3, 0.3)
console.log("MMR выбрал (id):", mmrPicks.map(p => (p as any).id).join(", "))

// naive top-3 = самые похожие
const naive = [...candidates]
  .sort((a, b) => cosineSimilarity(queryVec, b.vector) - cosineSimilarity(queryVec, a.vector))
  .slice(0, 3)
console.log("naive top-3 cos:", naive.map(c => cosineSimilarity(queryVec, c.vector).toFixed(3)).join(", "))
console.log("MMR cos к запросу:", mmrPicks.map(p => cosineSimilarity(queryVec, p.embedding!).toFixed(3)).join(", "))
// разнообразие внутри выборки
function diversity(picks: any[]): number {
  if (picks.length < 2) return 0
  let s = 0, n = 0
  for (let i = 0; i < picks.length; i++)
    for (let j = i + 1; j < picks.length; j++) {
      s += cosineSimilarity(picks[i].embedding!, picks[j].embedding!); n++
    }
  return s / n
}
console.log("средний cos внутри naive:", diversity(naive.map(c => c.item)).toFixed(3))
console.log("средний cos внутри MMR:  ", diversity(mmrPicks as any[]).toFixed(3))

console.log("\n=== 2. Seasonal anchor ===")
const anchor = getSeasonalAnchor(new Date("2026-11-03"))
console.log("якорь на 03.11:", anchor.text, "| keywords:", anchor.keywords.join(","))
console.log("hit (есть 'холод'):", anchorHit("на улице холодный ветер", anchor))
console.log("miss (нет темы):", anchorHit("я пила кофе и смотрела в стену", anchor))
// ротация: разные дни месяца дают разные детали
const days = [1, 2, 3, 4, 5, 6, 7, 8].map(d => getSeasonalAnchor(new Date(2026, 10, d)).text)
console.log("ротация по дням 1-8 ноября:", [...new Set(days)].length, "уникальных из", days.length)
