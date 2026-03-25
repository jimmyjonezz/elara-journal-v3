// domain/self-state.ts
export interface SelfState {
  mood: "calm" | "curious" | "reflective" | "gentle" | "attentive"
  themes: string[]
  drift: number
  confidence: number
}
