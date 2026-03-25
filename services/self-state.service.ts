// services/self-state.service.ts
export function updateState(
  state: SelfState,
  reflection: any
): SelfState {

  // если много "repetition" → увеличиваем drift
  if (reflection.issues?.includes("repetition")) {
    state.drift = Math.min(1, state.drift + 0.2)
  }

  // если всё хорошо → повышаем confidence
  if (reflection.score > 0.8) {
    state.confidence = Math.min(1, state.confidence + 0.1)
  }

  // обновляем темы
  const newThemes = reflection.themes || []
  state.themes = [...new Set([...state.themes, ...newThemes])].slice(0, 5)

  // простая смена настроения
  const moods = ["calm", "curious", "analytical", "drifting"]
  state.mood = moods[Math.floor(Math.random() * moods.length)]

  return state
}
