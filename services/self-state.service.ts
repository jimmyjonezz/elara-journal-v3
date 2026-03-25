// services/self-state.service.ts
import { SelfState } from "../domain/self-state"
import { Reflection } from "../domain/reflection"

export function updateState(
  state: SelfState,
  reflection: Reflection
): SelfState {
  // --- drift (борьба с повторениями) ---
  if (reflection.issues?.includes("repetition")) {
    state.drift = Math.min(1, state.drift + 0.2)
  }

  // --- confidence ---
  if (reflection.score && reflection.score > 0.8) {
    state.confidence = Math.min(1, state.confidence + 0.1)
  } else {
    state.confidence = Math.max(0, state.confidence - 0.05)
  }

  // --- themes ---
  const newThemes = reflection.themes || []
  state.themes = [...new Set([...state.themes, ...newThemes])].slice(0, 5)

  // --- mood ---
  const moods: SelfState["mood"][] = [
    "calm",
    "curious",
    "analytical",
    "drifting"
  ]
  state.mood = moods[Math.floor(Math.random() * moods.length)]

  return state
}
