import { JournalEngine } from "./core/journalEngine"

import { JsonMemoryService } from "./services/memory.service"
import { AIGenerator } from "./services/generator.service"
import { AIReflector } from "./services/reflector.service"
import { SimpleEvaluator } from "./services/evaluator.service"
import { ConsolePublisher } from "./services/publisher.service"

import { OllamaClient } from "./infra/llm/ollama.client"
import { OllamaEmbeddingService } from "./services/embedding.service"
import { FilePromptManager } from "./services/prompt.service"

async function main() {
  const llm = new OllamaClient()
  const prompts = new FilePromptManager()

  const embedding = new OllamaEmbeddingService(llm)
  const memory = new JsonMemoryService(embedding)

  const generator = new AIGenerator(llm, prompts, memory)
  const reflector = new AIReflector(llm, prompts)

  const evaluator = new SimpleEvaluator()
  const publisher = new ConsolePublisher()

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
