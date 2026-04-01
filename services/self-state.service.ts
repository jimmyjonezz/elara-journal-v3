// services/self-state.service.ts

import { SelfState, MoodPrimary } from "../domain/self-state"
import { Reflection } from "../domain/reflection"

function getPrimaryMood(drift: number, confidence: number, score: number): MoodPrimary {
  if (drift > 0.7) return "calm"
  if (confidence > 0.75) return "curious"
  if (score < 0.4) return "gentle"
  if (score > 0.8) return "energetic"
  if (drift < 0.3) return "focused"
  return "reflective"
}

function getIntensity(score: number, drift: number): number {
  const base = score
  const driftFactor = drift * 0.3
  const raw = Math.min(1, Math.max(0, base - driftFactor))
  return Math.round(raw * 10) / 10
}

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
  ).slice(0, 5)

  // --- Insights ---
  const insights = Array.from(
    new Set([
      ...(prev.insights || []),
      ...(reflection.newInsights || [])
    ])
  ).slice(0, 10)

  // --- Mood ---
  const primary = getPrimaryMood(drift, confidence, score)
  const intensity = getIntensity(score, drift)

  const secondary = Array.from(
    new Set([
      ...(prev.mood?.secondary || []),
      ...(reflection.secondary || [])
    ])
  ).slice(0, 5)

  const mood = {
    primary,
    secondary,
    intensity
  }

  return {
    mood,
    themes,
    insights,
    drift,
    confidence
  }
}
