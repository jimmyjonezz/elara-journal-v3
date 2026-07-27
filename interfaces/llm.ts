export interface LLMClient {
  generate(prompt: string, options?: { temperature?: number; top_p?: number }): Promise<string>
}
