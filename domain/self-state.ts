// domain/self-state.ts
export interface SelfState {
  mood: "calm" | "curious" | "analytical" | "drifting"
  themes: string[]
  drift: number        // 0..1 (насколько отклоняться от прошлого)
  confidence: number   // 0..1 (насколько следовать reflection)
}
