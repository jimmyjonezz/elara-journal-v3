// services/self-state.service.ts

import { SelfState } from "../domain/self-state"
import { Reflection } from "../domain/reflection"

export function updateState(
  prev: SelfState,
  reflection: Reflection
): SelfState {

  // --- Drift ---
  const repetitionSignals = ["repetition", "similar", "redundant"]

  const hasRepetition = reflection.issues?.some(issue =>
    repetitionSignals.some(signal => issue.toLowerCase().includes(signal))
  )

  const drift = hasRepetition
    ? Math.min(1, prev.drift + 0.15)
    : prev.drift * 0.97

  // --- Confidence ---
  const score = reflection.score ?? 0.5

  const confidenceDelta = (score - 0.5) * 0.2
  const confidence = Math.max(
    0,
    Math.min(1, prev.confidence + confidenceDelta)
  )

  // --- Themes ---
  const normalize = (t: string) => t.toLowerCase().trim()

  const themes = Array.from(
    new Set([
      ...(prev.themes || []).map(normalize),
      ...(reflection.themes || []).map(normalize)
    ])
  ).slice(-5)

  // --- Insights (новое) ---
  const insights = Array.from(
    new Set([
      ...(prev.insights || []),
      ...(reflection.newInsights || [])
    ])
  ).slice(0, 10)

  // --- Mood ---
  let mood: SelfState["mood"]

  if (drift > 0.7) {
    mood = "calm"
  } else if (confidence > 0.75) {
    mood = "curious"
  } else if (score < 0.4) {
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
