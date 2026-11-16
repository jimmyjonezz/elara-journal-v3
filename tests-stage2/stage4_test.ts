// Тест стадии 4: MMR vs top-3, seasonal pools (data-файл), семантический
// anchorHit, идемпотентность сканера мотивов.
//
// Сетевых вызовов НЕТ: эмбеддинги записей берутся из data/embeddings.json
// (закэшированы), эмбеддинги якорей — из тестового файла-мока.
import * as fs from "fs"
import * as path from "path"
import { mmrSelect, cosineSimilarity, MmrCandidate } from "../utils/vector.utils"
import {
  getSeasonalAnchor,
  loadSeasonalPools,
  anchorHit,
  anchorLexicalOverlap,
  _resetSeasonalCache
} from "../services/seasonal.service"
import { MotifTracker } from "../services/motif.service"
import { Entry } from "../domain/entry"

const dataDir = path.resolve(__dirname, "..", "..", "data")
const tmpDir = path.resolve(__dirname, "..", "..", ".cache-test")
fs.mkdirSync(tmpDir, { recursive: true })

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

const naive = [...candidates]
  .sort((a, b) => cosineSimilarity(queryVec, b.vector) - cosineSimilarity(queryVec, a.vector))
  .slice(0, 3)
console.log("naive top-3 cos:", naive.map(c => cosineSimilarity(queryVec, c.vector).toFixed(3)).join(", "))
console.log("MMR cos к запросу:", mmrPicks.map(p => cosineSimilarity(queryVec, p.embedding!).toFixed(3)).join(", "))
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

console.log("\n=== 2. data/seasonal-pools.json: структура + валидатор ===")
const pools = loadSeasonalPools()
const monthKeys = Object.keys(pools).map(Number).sort((a, b) => a - b)
console.log("месяцев:", monthKeys.length, "| ключи 1..12 без пропусков:", monthKeys.join(","))
if (monthKeys.length !== 12 || monthKeys[0] !== 1 || monthKeys[11] !== 12) {
  throw new Error(`РЕГРЕССИЯ: ключи месяцев должны быть 1..12, получили ${monthKeys.join(",")}`)
}
let totalAnchors = 0
for (const m of monthKeys) {
  const pool: any[] = (pools as any)[m]
  totalAnchors += pool.length
  for (const a of pool) {
    if (typeof a.text !== "string" || !a.text.trim()) {
      throw new Error(`РЕГРЕССИЯ: месяц ${m} содержит пустой text`)
    }
    // после рефактора keywords не должно существовать вовсе
    if ("keywords" in a) throw new Error(`РЕГРЕССИЯ: «${a.text}» ещё содержит keywords — стемы не вычищены`)
  }
}
console.log("всего якорей:", totalAnchors, "| keywords нигде нет ✓")

// валидатор: битые варианты должны ОТКАЗЫВАТЬ (fail loudly)
function expectThrows(name: string, file: any): void {
  const tmpPools = path.join(tmpDir, "pools-bad.json")
  fs.writeFileSync(tmpPools, JSON.stringify(file))
  process.env.SEASONAL_POOLS_PATH = tmpPools
  _resetSeasonalCache()
  let threw = false
  try {
    loadSeasonalPools()
  } catch {
    threw = true
  }
  _resetSeasonalCache()
  delete process.env.SEASONAL_POOLS_PATH
  if (!threw) throw new Error(`РЕГРЕССИЯ: валидатор не упал на кейсе «${name}»`)
  console.log(` валится на «${name}» ✓`)
}
expectThrows("ключ не месяц", { "13": [{ text: "зима" }] })
expectThrows("пустой пул месяца", { "7": [] })
expectThrows("пустой text", { "7": [{ text: "   " }] })
expectThrows("дубль в месяце", { "7": [{ text: "жара" }, { text: "жара" }] })

console.log("\n=== 2b. выбор якоря по дате (внешний вход, детерминизм) ===")
const jan1 = getSeasonalAnchor(new Date(2026, 0, 1))
const dec31 = getSeasonalAnchor(new Date(2026, 11, 31))
console.log("01.01:", jan1.text, "| 31.12:", dec31.text)
if (jan1.text === dec31.text) throw new Error("РЕГРЕССИЯ: январь и декабрь дают один якорь (съезд нумерации месяцев)")
// январь и декабрь — разные пули, разные якоря
if (getSeasonalAnchor(new Date(2026, 0, 1)).text !== getSeasonalAnchor(new Date(2027, 0, 1)).text) {
  throw new Error("РЕГРЕССИЯ: якорь на одну дату разных лет расходится (недетерминировано)")
}
// ротация: день месяца → индекс в пуле
const novDays = [1, 2, 3, 4, 5, 6, 7, 8].map(d => getSeasonalAnchor(new Date(2026, 10, d)).text)
const uniq = [...new Set(novDays)]
console.log("ноябрь, дни 1–8: уникальных", uniq.length, "из", novDays.length)
if (uniq.length < 5) throw new Error(`РЕГРЕССИЯ: ротация ноября слишком однообразна (${uniq.length} уникальных)`)
// якорь — ТОЛЬКО дату, не похожести: тот же день → тот же якорь
const a1 = getSeasonalAnchor(new Date(2026, 10, 3))
console.log("03.11:", a1.text)

console.log("\n=== 3. anchorHit: семантика (без сети, мок-эмбеддинги) ===")
// Мок: якорь «первый лёд в луже» → вектор [1,0,0]; запись про лёд → близко,
// запись про жару → далеко. Проверяем логику статусов, а не качество voyage
// (качество — отдельный CI-probe с реальной моделью).
const embFile = path.join(tmpDir, "seasonal-emb-test.json")
fs.writeFileSync(
  embFile,
  JSON.stringify({
    model: "test-mock",
    dim: 3,
    inputType: "document",
    poolHash: "abc123",
    anchors: {
      "первый лёд в луже": [1, 0, 0],
      "знойный полдень": [0, 1, 0]
    }
  })
)
process.env.SEASONAL_EMBEDDINGS_PATH = embFile
_resetSeasonalCache()

const iceAnchor = { text: "первый лёд в луже" }

// мок-векторы, повторяющие «семантику» записей: лёд → [1,0,0], жара → [0,1,0]
const iceVec = [1, 0, 0]
const hotVec = [0, 1, 0]
console.log("hit на ледяной записи:", JSON.stringify(anchorHit(iceVec, iceAnchor)))
console.log("miss на жаркой записи:", JSON.stringify(anchorHit(hotVec, iceAnchor)))

const rHit = anchorHit(iceVec, iceAnchor)
if (rHit.status !== "hit") throw new Error(`РЕГРЕССИЯ: hit-кейс дал status=${rHit.status}`)
const rMiss = anchorHit(hotVec, iceAnchor)
if (rMiss.status !== "miss") throw new Error(`РЕГРЕССИЯ: miss-кейс дал status=${rMiss.status}`)
if (rHit.score === undefined || rMiss.score === undefined) {
  throw new Error("РЕГРЕССИЯ: score должен быть определён для hit/miss")
}
if (rHit.score! <= rMiss.score!) throw new Error(`РЕГРЕССИЯ: score hit(${rHit.score}) ≤ score miss(${rMiss.score})`)
if (rHit.model !== "test-mock") throw new Error(`РЕГРЕССИЯ: model не проброшен: ${rHit.model}`)
console.log("model пробрасывается ✓")

// unavailable ≠ miss: нет вектора записи / нет файла / нет якоря в файле
if (anchorHit([], iceAnchor).status !== "unavailable") throw new Error("РЕГРЕССИЯ: пустой вектор не unavailable")
if (anchorHit(undefined, iceAnchor).status !== "unavailable") throw new Error("РЕГРЕССИЯ: undefined вектор не unavailable")
const unknownAnchor = { text: "такого якоря нет в файле" }
if (anchorHit(iceVec, unknownAnchor).status !== "unavailable") {
  throw new Error("РЕГРЕССИЯ: отсутствующий в файле якорь не unavailable")
}
console.log("unavailable ≠ miss ✓")

// нет файла эмбеддингов вообще
const embMissing = path.join(tmpDir, "seasonal-emb-NOTEXIST.json")
process.env.SEASONAL_EMBEDDINGS_PATH = embMissing
_resetSeasonalCache()
if (anchorHit(iceVec, iceAnchor).status !== "unavailable") {
  throw new Error("РЕГРЕССИЯ: нет файла эмбеддингов — должно быть unavailable")
}
console.log("отсутствие файла → unavailable ✓")

_resetSeasonalCache()
delete process.env.SEASONAL_EMBEDDINGS_PATH

console.log("\n=== 3b. anchorLexicalOverlap: not-verbatim guard ===")
const liveAll: Entry[] = JSON.parse(fs.readFileSync(path.join(dataDir, "entries.json"), "utf-8"))
const live16 = liveAll.filter(e => (e.createdAt ?? "").toString().startsWith("2026-11-16"))
const novAnchor = getSeasonalAnchor(new Date(2026, 10, 16))
console.log("якорь 16.11:", novAnchor.text, "| записей 16.11 в корпусе:", live16.length)
// Информационно (без assertion): боевой корпус зависит от того, сколько
// прогонов CI успели написать запись за этот день, — детерминированные
// кейсы ниже проверяют метрику, а не корпус.
for (const e of live16) {
  console.log("  ", e.id.slice(0, 8), "overlap=", anchorLexicalOverlap((e as any).content, novAnchor))
}

// детерминированные кейсы
const verbatim = anchorLexicalOverlap("первый лёд в луже у подъезда", { text: "первый лёд в луже" })
const morph = anchorLexicalOverlap("У аптеки лужа затянулась первым тонким льдом", { text: "первый лёд в луже" })
const clean = anchorLexicalOverlap("На кухне пахло кофе и корицей, радио орало новости", { text: "первый лёд в луже" })
console.log("verbatim:", verbatim, "| морфопарафраз:", morph, "| чужая тема:", clean)

if (verbatim < 0.99) throw new Error("РЕГРЕССИЯ: дословное цитирование не ловится (verbatim < 1)")
// «лужа» и «первым» совпадут по 3-символьному префиксу, «льдом» (через ь) — нет → 0.67
if (morph !== 0.67) {
  throw new Error(`РЕГРЕССИЯ: морфопарафраз должен давать 0.67, получил ${morph} (префиксы сломались?)`)
}
if (clean > 0) throw new Error("РЕГРЕССИЯ: чужая тема даёт overlap > 0")
console.log("verbatim ловится, морфология учитывается, чужая тема — 0 ✓")

console.log("\n=== 4. P0: идемпотентность сканера (двойной счёт) ===")
// [СТАРИННЫЙ БАГ] scanEntryWithReflection не маркил id в scannedIds.
// Цикл CI: прогон 1 — backfill + live-скан новой записи → save.
// Прогон 2 — backfill видел новую запись как «свежую» и считал её ЕЩЁ РАЗ.
const tmp = path.join(tmpDir, "motif-test.json")
const seed = JSON.parse(fs.readFileSync(path.join(dataDir, "motif-state.json"), "utf-8"))
function mkEntry(id: string, content: string): Entry {
  return { id, content, createdAt: new Date("2026-11-16T10:00:00Z"), embedding: [] }
}
const oldA = mkEntry("p0-a", "Соль на коже крупинками, белая полоса на запястье")
const oldB = mkEntry("p0-b", "Старушка на скамейке кормила голубей у берега")
const fresh = mkEntry("p0-fresh", "Лёд в луже у аптеки, первое ноября")

function snapshot(st: any) {
  return JSON.stringify({
    motifs: Object.fromEntries(Object.entries(st.motifs).map(([k, v]: any) => [k, v.count])),
    total: st.totalScanned
  })
}

// --- прогон 1 ---
fs.writeFileSync(tmp, JSON.stringify({ ...seed, motifs: {}, totalScanned: 0, scannedIds: [] }))
const t1 = new MotifTracker(tmp)
t1.backfill([oldA, oldB])
t1.scanEntryWithReflection(fresh)
t1.save()
const st1 = JSON.parse(fs.readFileSync(tmp, "utf-8"))
const snap1 = snapshot(st1)
console.log("прогон 1: total", st1.totalScanned, "| scannedIds", st1.scannedIds.length)
if (st1.totalScanned !== 3) throw new Error(`ожидал totalScanned=3, получил ${st1.totalScanned}`)
if (!st1.scannedIds.includes("p0-fresh")) {
  throw new Error("РЕГРЕССИЯ P0: live-скан не маркил id в scannedIds (двойной счёт)")
}

// --- прогон 2: тот же корпус + та же «свежая» запись ---
const t2 = new MotifTracker(tmp)
t2.backfill([oldA, oldB, fresh])
t2.save()
const st2 = JSON.parse(fs.readFileSync(tmp, "utf-8"))
const snap2 = snapshot(st2)
console.log("прогон 2: total", st2.totalScanned, "| счётчики совпадают:", snap1 === snap2)
if (snap1 !== snap2) {
  console.log("  было:", snap1)
  console.log("  стало:", snap2)
  throw new Error("РЕГРЕССИЯ P0: второй прогон пересчитал уже отсканированную запись")
}
fs.unlinkSync(tmp)
console.log("оба прогона идемпотентны ✓")

console.log("\nВСЁ ЗЕЛЁНОЕ")
