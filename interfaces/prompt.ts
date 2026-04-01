// ---------- /interfaces/prompt.ts ----------
export type Prompt = {
  id: string
  version: string
  description: string
  template: string
}

export interface PromptManager {
  getPrompt(id: string): Promise<Prompt>
  render(template: string, variables: Record<string, string>): string
}
