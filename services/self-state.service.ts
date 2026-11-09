// services/self-state.service.ts

import { SelfState } from "../domain/self-state"
import { Reflection } from "../domain/reflection"

// [STAGE 3] repetitionSignal — измеряется, а не самооценивается.
// Раньше: LLM ставила repetitionScore не видя предыдущих текстов (слепа),
// themeRepeatRatio был exact-match длинных уникальных строк → всегда 0.
// Теперь: косинус принятой записи к предыдущим (0.75..1.00 → 0..1).
// Равновесие drift* = 0.08/(1-0.92) = 1.0×signal — линейная и предсказуемая
// связь: cos 0.80 → drift ~0.20 (phase 2), 0.85 → 0.40 (phase 2-3),
// 0.90 (ворота gate) → 0.60 (phase 4).
export function repetitionSignalFromCos(cos: number | undefined): number | null {
  if (cos === undefined || cos === null || Number.isNaN(cos)) return null
  return Math.max(0, Math.min(1, (cos - 0.75) / 0.25))
}

export function updateState(
  prev: SelfState,
  reflection: Reflection,
  repetitionCos?: number
): SelfState {

  // --- Drift: measured repetition ---
  // 1. LLM-based repetition score (0-10) — fallback, если нет эмбеддингов
  const repetitionScore = reflection.repetitionScore ?? 5

  // 2. Theme repeat ratio (0-1) — exact-match fallback
  const prevThemes = (prev.themes || []).map(t => t.toLowerCase().trim())
  const newThemes = (reflection.themes || []).map(t => t.toLowerCase().trim())
  const themeRepeats = newThemes.filter(t => prevThemes.includes(t)).length
  const themeRepeatRatio = prevThemes.length > 0 ? themeRepeats / prevThemes.length : 0

  const fallbackSignal = (repetitionScore / 10) * 0.6 + themeRepeatRatio * 0.4
  const measuredSignal = repetitionSignalFromCos(repetitionCos)
  const repetitionSignal = measuredSignal ?? fallbackSignal

  // 3. Growth with decay
  // Равновесие drift* = repetitionSignal (0.08/(1-0.92) = 1.0)
  const drift = Math.min(1, Math.max(0, prev.drift * 0.92 + repetitionSignal * 0.08))

  // --- Confidence (EMA with drift penalty) ---
  const score = reflection.score ?? 5

  const baseScore = score / 10
  const driftPenalty = prev.drift * 0.15
  const smoothing = 0.25

  const confidence = Math.max(
    0,
    Math.min(1, prev.confidence * (1 - smoothing) + (baseScore - driftPenalty) * smoothing)
  )

  // --- Themes (накопление из reflection.themes) ---
  const themes = Array.from(
    new Set([
      ...(prev.themes || []),
      ...(reflection.themes || [])
    ])
  ).slice(-10)

  // --- Insights (новое) ---
  const insights = Array.from(
    new Set([
      ...(prev.insights || []),
      ...(reflection.newInsights || [])
    ])
  ).slice(-10)

  // --- System Tension (из reflection.systemTension, макс 3) ---
  const systemTension = Array.from(
    new Set([
      ...(prev.systemTension || []),
      ...(reflection.systemTension || [])
    ])
  ).slice(-3)

  // --- Unresolved threads (заброшенные + текущие открытые ситуации) ---
  const openSituation = (reflection.themes?.[1])
    ? `${reflection.themes[1]}`
    : null

  const freshThreads = [
    ...(openSituation ? [openSituation] : []),
    ...(reflection.systemTension || [])
  ]

  // Abandoned threads НЕ поднимаем в приоритет — иначе система вечно воскрешает
  // брошенные линии, и loop не рвётся. Свежие открытые — впереди.
  const abandoned = reflection.abandonedThreads || []

  const merged = [
    ...freshThreads,
    ...(prev.unresolvedThreads || []),
    ...abandoned
  ]

  const unresolvedThreads = Array.from(
    new Set(merged)
  ).slice(0, 7)

  // --- Mood ---
  let mood: SelfState["mood"]

  if (drift >= 0.8) {
    mood = "desperate"
  } else if (drift >= 0.6) {
    mood = "anxious"
  } else if (drift >= 0.4) {
    mood = "frustrated"
  } else if (score <= 4) {
    mood = "gentle"
  } else if (confidence > 0.6 && drift < 0.3) {
    mood = "curious"
  } else {
    mood = "reflective"
  }

  // --- Narrative Phase (drift-based, только рост) ---
  const prevPhase = prev.narrativePhase ?? 1
  const phaseFromDrift = Math.max(1, Math.min(6, Math.round(drift * 6))) as 1 | 2 | 3 | 4 | 5 | 6
  const narrativePhase = phaseFromDrift

  return {
    mood,
    themes,
    insights,
    systemTension,
    unresolvedThreads,
    narrativePhase,
    drift,
    confidence
  }
}
