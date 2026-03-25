// domain/self-state.ts
export interface SelfState {
  mood: "calm" | "curious" | "reflective" | "gentle"
  themes: string[]
  drift: number
  confidence: number
}
