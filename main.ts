// ---------- /main.ts ----------
import { JournalEngine } from "./core/journalEngine"
import { InMemoryMemoryService } from "./services/memory.service"
import { MockGenerator } from "./services/generator.service"
import { MockReflector } from "./services/reflector.service"
import { SimpleEvaluator } from "./services/evaluator.service"
import { ConsolePublisher } from "./services/publisher.service"
import { MockEmbeddingService } from "./services/embedding.service"

async function main() {
  const memory = new InMemoryMemoryService()
  const generator = new MockGenerator()
  const reflector = new MockReflector()
  const evaluator = new SimpleEvaluator()
  const publisher = new ConsolePublisher()
  const embedding = new MockEmbeddingService()

  const engine = new JournalEngine(
    memory,
    generator,
    reflector,
    evaluator,
    publisher,
    embedding
  )

  await engine.runCycle()
}

main()
