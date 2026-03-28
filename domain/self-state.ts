// domain/self-state.ts

export interface SelfState {
  mood: "calm" | "curious" | "reflective" | "gentle"

  themes: string[]

  // ✅ новое поле
  insights: string[]

  drift: number
  confidence: number
}
