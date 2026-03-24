// ---------- /main.ts ----------
import { JournalEngine } from "./core/journalEngine"

import { JsonMemoryService } from "./services/memory.service"
//import { SQLiteEntryRepository } from "./infra/db/entry.repository"

import { AIGenerator } from "./services/generator.service"
import { AIReflector } from "./services/reflector.service"

import { SimpleEvaluator } from "./services/evaluator.service"
import { ConsolePublisher } from "./services/publisher.service"

import { OpenAIClient } from "./infra/llm/openai.client"
import { OpenAIEmbeddingService } from "./services/embedding.service"
import { FilePromptManager } from "./services/prompt.service"

async function main() {
  const llm = new OpenAIClient()
  const prompts = new FilePromptManager()

  //const repo = new SQLiteEntryRepository()
  const memory = new JsonMemoryService()

  const generator = new AIGenerator(llm, prompts)
  const reflector = new AIReflector(llm, prompts)

  const evaluator = new SimpleEvaluator()
  const publisher = new ConsolePublisher()
  const embedding = new OpenAIEmbeddingService(llm)

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
