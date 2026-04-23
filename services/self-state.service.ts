// services/self-state.service.ts

import { SelfState } from "../domain/self-state"
import { Reflection } from "../domain/reflection"

export function updateState(
  prev: SelfState,
  reflection: Reflection
): SelfState {

  // --- Drift (hybrid approach) ---
  // 1. LLM-based repetition score (0-10)
  const repetitionScore = reflection.repetitionScore ?? 5

  // 2. Theme repeat ratio (0-1)
  const prevThemes = (prev.themes || []).map(t => t.toLowerCase().trim())
  const newThemes = (reflection.themes || []).map(t => t.toLowerCase().trim())
  const themeRepeats = newThemes.filter(t => prevThemes.includes(t)).length
  const themeRepeatRatio = prevThemes.length > 0 ? themeRepeats / prevThemes.length : 0

  // 3. Combine signals: LLM score (60%) + theme ratio (40%)
  const repetitionSignal = (repetitionScore / 10) * 0.6 + themeRepeatRatio * 0.4

  // 4. Growth with decay
  const drift = Math.min(1, prev.drift * 0.97 + repetitionSignal * 0.15)

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
  ).slice(0, 10)

  // --- Mood ---
  let mood: SelfState["mood"]

  if (drift > 0.5) {
    mood = "calm"
  } else if (confidence > 0.6 && drift < 0.2) {
    mood = "curious"
  } else if (score <= 4) {
    mood = "gentle"
  } else {
    mood = "reflective"
  }

  return {
    mood,
    themes,
    insights,
    drift,
    confidence
  }
}
