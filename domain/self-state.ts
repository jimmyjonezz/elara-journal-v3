// domain/self-state.ts
export interface SelfState {
  mood: "calm" | "curious" | "analytical" | "drifting"
  themes: string[]
  drift: number
  confidence: number
}
