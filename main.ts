import { JournalEngine } from "./core/journalEngine"

import { JsonMemoryService } from "./services/memory.service"
import { AIGenerator } from "./services/generator.service"
import { AIReflector } from "./services/reflector.service"
import { SimpleEvaluator } from "./services/evaluator.service"
import { ConsolePublisher } from "./services/publisher.service"

import { OllamaClient } from "./infra/llm/ollama.client" // используется только для генерации
import { VoyageClient } from "./infra/llm/voyage.client"
import { VoyageEmbeddingService } from "./services/embedding.service"

import { FilePromptManager } from "./services/prompt.service"

async function main() {
  // --- LLM (генерация) ---
  const llm = new OllamaClient()

  // --- Prompts ---
  const prompts = new FilePromptManager()

  // --- Embedding (Voyage) ---
  const voyage = new VoyageClient()
  const embedding = new VoyageEmbeddingService(voyage)

  // --- Memory ---
  const memory = new JsonMemoryService(embedding)

  // --- Core services ---
  const generator = new AIGenerator(llm, prompts, memory)
  const reflector = new AIReflector(llm, prompts)

  const evaluator = new SimpleEvaluator()
  const publisher = new ConsolePublisher()

  // --- Engine ---
  const engine = new JournalEngine(
    memory,
    generator,
    reflector,
    evaluator,
    publisher,
    embedding
  )

  // --- Optional debug (можно удалить позже) ---
  const test = await embedding.embed("test embedding")
  console.log("EMBED LENGTH:", test.length)

  // --- Run ---
  await engine.runCycle()
}

main()
