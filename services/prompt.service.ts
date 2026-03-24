import { PromptManager, Prompt } from "../interfaces/prompt"
import * as fs from "fs"

export class FilePromptManager implements PromptManager {
  async getPrompt(id: string): Promise<Prompt> {
    const template = fs.readFileSync(`./prompts/${id}.txt`, "utf-8")

    return {
      id,
      version: "1.0",
      template
    }
  }
}
