// domain/self-state.ts

export type NarrativePhase = 1 | 2 | 3 | 4 | 5 | 6

export interface SelfState {
  mood: "calm" | "curious" | "reflective" | "gentle" | "anxious" | "frustrated" | "desperate"

  themes: string[]

  insights: string[]

  systemTension: string[]

  unresolvedThreads: string[]

  narrativePhase: NarrativePhase

  drift: number
  confidence: number
}
