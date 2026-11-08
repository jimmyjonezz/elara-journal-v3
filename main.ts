// main.ts

import * as dotenv from "dotenv"
dotenv.config()

import { JournalEngine } from "./core/journalEngine"

import { JsonMemoryService } from "./services/memory.service"
import { AIGenerator } from "./services/generator.service"
import { AIReflector } from "./services/reflector.service"
import { SimpleEvaluator } from "./services/evaluator.service"
import { ConsolePublisher } from "./services/publisher.service"

import { OllamaClient } from "./infra/llm/ollama.client"
import { VoyageClient } from "./infra/llm/voyage.client"

import { FilePromptManager } from "./services/prompt.service"

async function main() {
  // --- LLM ---
  //const llm = new OpenCodeClient()
  const llm = new OllamaClient()

  // --- Prompts ---
  const prompts = new FilePromptManager()

  // --- Embedding ---
  const embedding = new VoyageClient()

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

// Запуск: ошибка роняет процесс (exit 1), чтобы CI видел провал, а не
// молча коммитил «No changes» 2.5 месяца (как было с закомментированным
// Ollama-клиентом — сайт стоял с 20 августа при зелёных.Run'ах).
main().catch(err => {
  console.error("Fatal error:", err)
  process.exit(1)
})

