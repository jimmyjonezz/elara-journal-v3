// main.ts

import "dotenv/config"

import { JournalEngine } from "./core/journalEngine"

import { JsonMemoryService } from "./services/memory.service"
import { AIGenerator } from "./services/generator.service"
import { AIReflector } from "./services/reflector.service"
import { SimpleEvaluator } from "./services/evaluator.service"
import { ConsolePublisher } from "./services/publisher.service"

import { OllamaClient } from "./infra/llm/ollama.client"

import { FilePromptManager } from "./services/prompt.service"

async function main() {
  // --- LLM + Embedding (Ollama) ---
  const llm = new OllamaClient()
  const embedding = llm

  // --- Prompts ---
  const prompts = new FilePromptManager()

  // --- Memory ---
  const memory = new JsonMemoryService(embedding)

  // --- Core services ---
  const generator = new AIGenerator(llm, prompts)
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

  // --- Run ---
  await engine.runCycle()
}

// безопасный запуск
main().catch(err => {
  console.error("Fatal error:", err)
})
