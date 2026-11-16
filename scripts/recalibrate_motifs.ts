// Один раз: сброс + чистый backfill по корпусу.
// Запуск: npx ts-node scripts/recalibrate_motifs.ts
import * as fs from "fs"
import { MotifTracker } from "../services/motif.service"
import { Entry } from "../domain/entry"

const entries: Entry[] = JSON.parse(fs.readFileSync("data/entries.json", "utf-8"))

const t = new MotifTracker()
t.backfill(entries)
t.save()

const st = JSON.parse(fs.readFileSync("data/motif-state.json", "utf-8"))
console.log("totalScanned:", st.totalScanned, "| scannedIds:", st.scannedIds.length)

const top = Object.values(st.motifs)
  .filter((m: any) => m.exhaustion >= 5)
  .sort((a: any, b: any) => b.exhaustion - a.exhaustion || b.count - a.count)

console.log("exhausted мотивов:", top.length)
for (const m of top.slice(0, 8) as any[]) {
  console.log(`  ${m.label} — count ${m.count}, exh ${m.exhaustion}`)
}
