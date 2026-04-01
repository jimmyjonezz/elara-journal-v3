import { PromptManager, Prompt } from "../interfaces/prompt"
import * as fs from "fs"

export class FilePromptManager implements PromptManager {
  async getPrompt(id: string): Promise<Prompt> {
    const raw = fs.readFileSync(`./prompts/${id}.txt`, "utf-8")

    const lines = raw.split("\n")
    let version = "1.0"
    let description = ""
    let templateStart = 0

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      if (line.startsWith("# version:")) {
        version = line.replace("# version:", "").trim()
      } else if (line.startsWith("# description:")) {
        description = line.replace("# description:", "").trim()
      } else if (line.startsWith("---")) {
        templateStart = i + 1
        break
      }
    }

    const template = lines.slice(templateStart).join("\n").trim()

    return {
      id,
      version,
      description,
      template
    }
  }

  render(template: string, variables: Record<string, string>): string {
    let result = template

    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `<${key}>`
      result = result.replace(new RegExp(placeholder, "g"), value)
    }

    result = result.replace(/<\w+>/g, "")

    return result.trim()
  }
}
