// Тест новых паттернов мотивов на реальном корпусе (stage 2)
import * as fs from "fs"
import { MotifTracker } from "../services/motif.service"
import { Entry } from "../domain/entry"

const entries: Entry[] = JSON.parse(
  fs.readFileSync("/data/data/com.termux/files/home/elara-journal-v3/data/entries.json", "utf-8")
)

const tracker = new MotifTracker()

// 1. Идемпотентный backfill: два раза подряд — totalScanned не должен удвоиться
tracker.backfill(entries)
const after1 = JSON.parse(JSON.stringify(tracker as any)).state ?? null
tracker.backfill(entries)
// читаем состояние через приватное поле через any
const st = (tracker as any).state
console.log("после 1-го backfill: totalScanned =", st.totalScanned)
console.log("после 2-го backfill: totalScanned =", st.totalScanned, "(должно остаться", entries.length, ")")
console.log("scannedIds:", st.scannedIds?.length, "уникальных:", new Set(st.scannedIds ?? []).size)

// 2. Счётчики мотивов
console.log("\n=== счётчики по корпусу (ожидаются: соль ~16, старушка ~13, К ~11) ===")
for (const m of Object.values(st.motifs) as any[]) {
  if (m.count > 0) console.log(`  ${m.count}/${entries.length}  ${m.label}`)
}

// 3. sanity-ловушки
const matchWord = (c: string, p: string) => new RegExp(`(?<![а-яё])(${p})(?![а-яё])`, "i").test(c)
console.log("\n'смотрела' → food_meal (false ожидаем):", matchWord("смотрела", "ел[аи]"))
console.log("'ела' → food_meal (true ожидаем):", matchWord("ела", "ел[аи]"))
console.log("'соль' → salt (true ожидаем):", matchWord("соль", "сол[ьюи]"))
console.log("'насоловила' → salt (false ожидаем):", matchWord("насоловила", "сол[ьюи]"))
