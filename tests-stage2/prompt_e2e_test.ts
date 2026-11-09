// E2E сборка промпта: проверка плейсхолдеров на реальных данных
import * as fs from "fs"
import { AIGenerator } from "../services/generator.service"
import { FilePromptManager } from "../services/prompt.service"
import { getSeasonalAnchor } from "../services/seasonal.service"
import { Context } from "../domain/context"
import { mmrSelect } from "../utils/vector.utils"

const dataDir = "/data/data/com.termux/files/home/elara-journal-v3/data"

async function main() {
  const entries: any[] = JSON.parse(fs.readFileSync(dataDir + "/entries.json", "utf-8"))
  const embeddings: any[] = JSON.parse(fs.readFileSync(dataDir + "/embeddings.json", "utf-8"))
  const refl: any[] = JSON.parse(fs.readFileSync(dataDir + "/reflections.json", "utf-8"))
  const state: any = JSON.parse(fs.readFileSync(dataDir + "/self-state.json", "utf-8"))
  const motifs = JSON.parse(fs.readFileSync(dataDir + "/motif-state.json", "utf-8"))

  const eMap = new Map(entries.map(e => [e.id, e]))
  for (const em of embeddings) {
    const e = eMap.get(em.id)
    if (e) e.embedding = em.embedding
  }
  const sorted = entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const recent = sorted.slice(0, 5)

  const excludeIds = new Set(recent.map(e => e.id))
  const candidates = sorted
    .filter(e => e.embedding && !excludeIds.has(e.id))
    .map(e => ({ item: e, vector: e.embedding }))
  const echoes = mmrSelect(recent[0].embedding, candidates, 3, 0.3)

  // exhausted motifs как их отдаёт MotifTracker
  const exhausted = Object.values(motifs.motifs)
    .filter((m: any) => m.exhaustion >= 5)
    .sort((a: any, b: any) => b.exhaustion - a.exhaustion)
    .map((m: any) => `[ПОВТОР МОТИВА] ${m.label} — уже использован ${m.count} раз(а)`)

  const context: Context = {
    recentEntries: recent,
    distantEchoes: echoes,
    reflections: refl.slice(0, 3),
    workingMemory: state.unresolvedThreads.slice(0, 3),
    state,
    exhaustedMotifs: exhausted,
    seasonalAnchor: getSeasonalAnchor()
  }

  // генератор с LLM-заглушкой
  const stub = { generate: async () => "STUB" }
  const gen = new AIGenerator(stub as any, new FilePromptManager())

  // поднимем приватный метод через any
  const built = await (gen as any).generate(context, ["проверка retry-канала"])

  // перехватим промпт: патчим llm
  let captured = ""
  const stub2 = { generate: async (_p: string) => { captured = _p; return "STUB" } }
  const gen2 = new AIGenerator(stub2 as any, new FilePromptManager())
  await (gen2 as any).generate(context, ["проверка retry-канала"])

  console.log("=== оставшиеся плейсхолдеры (должен быть только None) ===")
  const leftovers = (captured.match(/\{\{[^}]+\}\}/g) || []).filter(p => p !== "None")
  console.log(leftovers.length === 0 ? "ЧИСТО — все плейсхолдеры заполнены" : leftovers)

  console.log("\n=== секции промпта (превью) ===")
  for (const section of ["SEASONAL ANCHOR", "DISTANT ECHOES", "RETRY FEEDBACK", "Dynamic Avoid", "Dynamic Improve"]) {
    const idx = captured.indexOf(section)
    console.log(`--- ${section} ---`)
    console.log(idx >= 0 ? captured.slice(idx, idx + 220) : "НЕ НАЙДЕНО")
  }

  console.log("\n=== rebalance avoid/improve: фактический размер ===")
  const avoidLines = (captured.match(/Dynamic Avoid:([\s\S]*?)\n• Dynamic Improve/s) || [])[1] || ""
  const avoidCount = avoidLineCount(captured)
  console.log("мотивов в avoid (было 8, цель ≤3):", avoidCount)
  const improveCount = (captured.match(/Dynamic Improve:([\s\S]*?)\n\s*•|\n\n/s) || [])[1]?.split("\n").filter(Boolean).length ?? "?"
  console.log("строк в improve (было 5, цель ≤2):", improveCount)
}
function avoidLineCount(captured: string): number {
  const block = (captured.match(/Dynamic Avoid:([\s\S]*?)(?=\n\n|\n• [A-Z])/) || [])[1] || ""
  return block.split("\n").filter(l => l.includes("ПОВТОР")).length
}
main().catch(e => { console.error(e); process.exit(1) })
