// services/self-state.service.ts

import { SelfState } from "../domain/self-state"
import { Reflection } from "../domain/reflection"

export function updateState(
  prev: SelfState,
  reflection: Reflection
): SelfState {
  const drift =
    reflection.issues?.includes("repetition")
      ? Math.min(1, prev.drift + 0.2)
      : prev.drift * 0.95

  const confidence =
    reflection.score && reflection.score > 0.8
      ? Math.min(1, prev.confidence + 0.1)
      : Math.max(0, prev.confidence - 0.05)

  const themes = [
    ...new Set([...(prev.themes || []), ...(reflection.themes || [])])
  ].slice(0, 5)

  const moods: SelfState["mood"][] = [
    "calm", 
    "curious", 
    "reflective", 
    "gentle", 
    "attentive"
  ]

  return {
    mood: moods[Math.floor(Math.random() * moods.length)],
    themes,
    drift,
    confidence
  }
}
