// scripts/probe-sentence-anchor.ts
//
// ЭКСПЕРИМЕНТ: проверка гипотезы, что косинус на УРОВНЕ ПРЕДЛОЖЕНИЙ
// (а не всей записи) разделяет «сезонный якорь присутствует» от «не присутствует».
//
// Контекст: косинус якорь(5 слов) vs запись(600 символов) не разделяет
// (positive control 0.476 внутри шума: медиана 0.393, p95 0.474).
// Гипотеза: предложение (~20 слов) сопоставимо с якорем по масштабу,
// и max(cos(anchor, предложение)) по всем предложениям записи должен
// давать реальным попаданиям distinctly больший score.
//
// Критерий успеха (задаём ДО просмотра результата):
//   медиана positives ≥ p95 negatives + 0.05
// Иначе — метод не работает, оставляем anchorLexicalOverlap.
//
// РЕЗУЛЬТАТ (прогон 43866053662, 25 записей × 63 якоря, 740 предложений):
//   медиана positives = 0.627, p95 negatives = 0.686 → margin −0.059 ❌
//   Реальный hit («первый лёд в луже» × запись 16.11, присутствует дословно)
//   не попал в топ-25, тогда как шумовый max = 0.809 (случайная «паутина
//   в углах» к той же записи).
// ВЫВОД: метод НЕ работает. Причина фундаментальная — корпус дневника
// семантически однороден (быт/природа/сезоны как фон в каждой записи),
// любой бытовой якорь получает высокий косинус с каким-то предложением
// любой записи. Косинус-детектор присутствия на этом корпусе нежизнеспособен
// ни на уровне записи, ни на уровне предложений. Рабочий сигнал —
// anchorLexicalOverlap; семантика остаётся shadow-наблюдаемой.
// Зонд оставлен как воспроизводимое доказательство (запуск вручную).
//
// Запуск: npx ts-node scripts/probe-sentence-anchor.ts (нужен VOYAGE_API_KEY)
// CI: .github/workflows/anchor-probe.yml (workflow_dispatch).

import * as fs from "fs"
import * as path from "path"
import { loadSeasonalPools } from "../services/seasonal.service"
import { VoyageClient } from "../infra/llm/voyage.client"
import { cosineSimilarity } from "../utils/vector.utils"

interface AnchorEmb {
  model: string
  dim: number
  anchors: { [text: string]: number[] }
}

function splitSentences(text: string): string[] {
  return text
    .replace(/\n+/g, " ")
    .split(/(?<=[.!?…])\s+/)
    .map(s => s.trim())
    .filter(s => s.length >= 20 && /[а-я]/i.test(s))
}

function median(xs: number[]): number {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.floor(s.length / 2)] : 0
}

function percentile(xs: number[], p: number): number {
  const s = [...xs].sort((a, b) => a - b)
  return s.length ? s[Math.min(s.length - 1, Math.floor(s.length * p))] : 0
}

async function main(): Promise<void> {
  const entries: { id: string; createdAt: string; content: string }[] = JSON.parse(
    fs.readFileSync(path.resolve("data", "entries.json"), "utf-8")
  )
  const anchorEmb: AnchorEmb = JSON.parse(
    fs.readFileSync(path.resolve("data", "seasonal-embeddings.json"), "utf-8")
  )
  const pools = loadSeasonalPools()
  const anchorTexts = [...new Set(Object.values(pools).flat().map(a => a.text))]

  // 1. бьём записи на предложения
  const sentences: { entryId: string; createdAt: string; text: string }[] = []
  for (const e of entries) {
    const createdAt = e.createdAt ?? new Date(0).toISOString()
    for (const s of splitSentences(e.content)) {
      sentences.push({ entryId: e.id, createdAt, text: s })
    }
  }
  console.log(`записей: ${entries.length} | предложений: ${sentences.length} | якорей: ${anchorTexts.length}`)

  // 2. эмбеддинги предложений (батчи по 100, пауза 25 c — лимит 3 RPM)
  const client = new VoyageClient()
  const BATCH = 100
  const vecs: number[][] = []
  for (let i = 0; i < sentences.length; i += BATCH) {
    const chunk = sentences.slice(i, i + BATCH)
    console.log(`батч ${i / BATCH + 1}/${Math.ceil(sentences.length / BATCH)}: ${chunk.length} предложений...`)
    vecs.push(...(await client.embedBatch(chunk.map(s => s.text), "document")))
    if (i + BATCH < sentences.length) await new Promise(r => setTimeout(r, 25000))
  }
  console.log(`получено векторов: ${vecs.length}`)

  // 3. score(entry, anchor) = max по предложениям записи
  // разметка pos/neg:лексический presence (prefix overlap ≥ 0.5) —
  // независимо от косинуса, проверяется руками
  interface Pair {
    score: number
    date: string
    anchor: string
    entryId: string
    pos: boolean
  }
  const pairs: Pair[] = []
  for (const e of entries) {
    const date = (e.createdAt ?? "").toString().slice(0, 10)
    const sIdx = sentences.map((s, j) => ({ s, j })).filter(x => x.s.entryId === e.id)
    for (const at of anchorTexts) {
      const av = anchorEmb.anchors[at]
      if (!av) continue
      let best = -1
      for (const { j } of sIdx) {
        best = Math.max(best, cosineSimilarity(vecs[j], av))
      }
      // lexical presence (3-символьные prefix, как в anchorLexicalOverlap)
      const aws = at.toLowerCase().replace(/ё/g, "е").split(/[^а-я]+/).filter(w => w.length >= 3).map(w => w.slice(0, 3))
      const tw = new Set(
        e.content.toLowerCase().replace(/ё/g, "е").split(/[^а-я]+/).filter(w => w.length >= 3).map(w => w.slice(0, 3))
      )
      const lex = aws.length ? aws.filter(p => tw.has(p)).length / aws.length : 0
      pairs.push({ score: best, date, anchor: at, entryId: e.id.slice(0, 6), pos: lex >= 0.5 })
    }
  }

  const positives = pairs.filter(p => p.pos).map(p => p.score)
  const negatives = pairs.filter(p => !p.pos).map(p => p.score)
  console.log(`\n=== РАЗВЕДЕНИЕ (score = max косинус по предложениям) ===`)
  console.log(`positive pairs (lex presence ≥0.5): ${positives.length}`)
  console.log(`negative pairs: ${negatives.length}`)
  console.log(`positives : медиана=${median(positives).toFixed(3)} min=${Math.min(...positives).toFixed(3)} max=${Math.max(...positives).toFixed(3)}`)
  console.log(
    `negatives : медиана=${median(negatives).toFixed(3)} p90=${percentile(negatives, 0.9).toFixed(3)} p95=${percentile(negatives, 0.95).toFixed(3)} p99=${percentile(negatives, 0.99).toFixed(3)} max=${Math.max(...negatives).toFixed(3)}`
  )

  // критерий успеха: медиана positives ≥ p95 negatives + 0.05
  const p95neg = percentile(negatives, 0.95)
  const medPos = median(positives)
  const margin = medPos - p95neg
  console.log(`\nкритерий: медиана pos (${medPos.toFixed(3)}) ≥ p95 neg (${p95neg.toFixed(3)}) + 0.05 → margin ${margin >= 0.05 ? "✅ УДОВЛЕТВОРЁН" : "❌ НЕ ПРОЙДЕН"} (margin=${margin.toFixed(3)})`)

  console.log(`\nтоп-25 пар (score desc):`)
  for (const p of [...pairs].sort((a, b) => b.score - a.score).slice(0, 25)) {
    console.log(`  ${p.score.toFixed(3)} ${p.pos ? "POS" : "neg"} ${p.date} «${p.anchor}» [${p.entryId}]`)
  }

  console.log(`\nпозитивы по убыванию score (для оценки recall):`)
  for (const p of [...pairs].filter(x => x.pos).sort((a, b) => b.score - a.score).slice(0, 15)) {
    console.log(`  ${p.score.toFixed(3)} ${p.date} «${p.anchor}» [${p.entryId}]`)
  }
}

main().catch(e => {
  console.error("probe failed:", e?.message || e)
  process.exit(1)
})
