// domain/self-state.ts

export type MoodPrimary =
  | "calm"
  | "curious"
  | "reflective"
  | "gentle"
  | "energetic"
  | "melancholy"
  | "focused"
  | "restless"
  | "serene"
  | "intense"

export interface Mood {
  primary: MoodPrimary
  secondary: string[]
  intensity: number
}

export interface SelfState {
  mood: Mood

  themes: string[]

  insights: string[]

  drift: number
  confidence: number
}
