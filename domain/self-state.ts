// domain/self-state.ts

export interface SelfState {
  mood: "calm" | "curious" | "reflective" | "gentle" | "anxious" | "frustrated" | "desperate"

  themes: string[]

  insights: string[]

  systemTension: string[]

  unresolvedThreads: string[]

  drift: number
  confidence: number
}
