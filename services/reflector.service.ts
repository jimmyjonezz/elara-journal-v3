// ---------- /services/reflector.service.ts ----------
export class AIReflector {
  constructor(
    private llm: OpenAIClient,
    private prompts: FilePromptManager
  ) {}

  async reflect(entry) {
    const prompt = await this.prompts.getPrompt("reflection")

    const input = `${prompt.template}\n\n${entry.content}`

    const analysis = await this.llm.generate(input)

    return {
      id: crypto.randomUUID(),
      entryId: entry.id,
      analysis,
      selfScore: 0.5,
      createdAt: new Date()
    }
  }
}
