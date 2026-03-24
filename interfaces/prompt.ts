// ---------- /interfaces/prompt.ts ----------
export type Prompt = {
  id: string
  version: string
  template: string
}

export interface PromptManager {
  getPrompt(id: string): Promise<Prompt>
}
