// utils/json.utils.ts

export function extractJSON(raw: string): string {
  // убираем ```json ... ```
  const cleaned = raw
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim()

  // иногда модель добавляет текст до/после JSON
  const start = cleaned.indexOf("{")
  const end = cleaned.lastIndexOf("}")

  if (start === -1 || end === -1) {
    throw new Error("No JSON found")
  }

  return cleaned.slice(start, end + 1)
}
