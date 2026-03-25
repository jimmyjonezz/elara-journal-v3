// main.ts

import { JsonMemoryService } from "./services/memory.service"
import { AIGenerator } from "./services/generator.service"
import { ReflectionService } from "./services/reflection.service"
import { EvaluationService } from "./services/evaluator.service"
import { ConsolePublisher } from "./services/publisher.service"
import { OllamaClient } from "./infra/llm/ollama.client"
import { VoyageEmbedding } from "./infra/embedding/voyage.service"
import { FilePromptManager } from "./services/prompt.service"
import { JournalEngine } from "./core/JournalEngine"

async function main() {
  const embedding = new VoyageEmbedding()
  const memory = new JsonMemoryService(embedding)

  const llm = new OllamaClient()
  const prompts = new FilePromptManager()

  const generator = new AIGenerator(llm, prompts)
  const reflector = new ReflectionService(llm)
  const evaluator = new EvaluationService()
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
