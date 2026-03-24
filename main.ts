const memory = new MemoryService(
  new SQLiteEntryRepository(),
  new InMemoryVectorStore()
)

const generator = new GeneratorService(
  new OpenAIClient(),
  new PromptManager()
)

const evaluator = new EvaluatorService()

const publisher = new ConsolePublisher()

const engine = new JournalEngine(
  memory,
  generator,
  reflector,
  evaluator,
  publisher,
  embeddingService
)

await engine.runCycle()
