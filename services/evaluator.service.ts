// ---------- /services/evaluator.service.ts ----------
import { Evaluator, EvaluationResult } from "../interfaces/evaluator"
import { Entry } from "../domain/entry"

const CONSEQUENCE_MARKERS = [
  "теперь", "в результате", "из-за этого", "после этого",
  "больше не", "перестал", "сломался", "лопнул", "потекло",
  "изменилось", "стало", "оказалось", "поэтому",
  "привело", "вызвало", "сдвинулось", "прекратилось"
]

const STOPWORDS = new Set([
  "который", "которая", "которые", "потому", "поэтому",
  "тогда", "когда", "чтобы", "также", "будто", "словно",
  "через", "между", "перед", "после", "всего", "этого",
  "этому", "такой", "такая", "такое", "другой", "другая",
  "самый", "самая", "самое", "очень", "совсем", "всегда",
  "иногда", "сейчас", "здесь", "там", "тут", "вот"
])

export function checkConsequences(entry: Entry, previousEntry: Entry | null): string | null {
  if (!previousEntry) return null

  const newContent = entry.content?.trim() ?? ""
  const prevContent = previousEntry.content?.trim() ?? ""

  if (!prevContent || !newContent) return null

  // Выделяем последнее предложение предыдущей записи
  const paragraphs = prevContent.split(/\n\n+/)
  const lastParagraph = paragraphs[paragraphs.length - 1]
  const sentences = lastParagraph.split(/[.?!]\s*/).filter(s => s.trim().length > 3)
  const lastSentence = sentences[sentences.length - 1]?.trim() ?? ""

  if (!lastSentence || lastSentence.length < 5) return null

  // Извлекаем ключевые слова (4+ символов, не стоп-слова)
  const keyWords = lastSentence
    .toLowerCase()
    .split(/[\s,():;—–-]+/)
    .filter(w => w.length >= 4 && !STOPWORDS.has(w))

  if (keyWords.length === 0) return null

  const newContentLower = newContent.toLowerCase()

  // Проверка 1: ключевое слово из предыдущей записи встречается в новой
  const hasContinuation = keyWords.some(w => newContentLower.includes(w))

  if (hasContinuation) return null

  // Проверка 2: есть маркер последствия
  const hasMarker = CONSEQUENCE_MARKERS.some(m => newContentLower.includes(m))

  if (hasMarker) return null

  return `Нет последствий предыдущего действия. Последняя строка: "${lastSentence.slice(0, 80)}"`
}

export class SimpleEvaluator implements Evaluator {
  async evaluate(entry: Entry): Promise<EvaluationResult> {
    const content = entry.content?.trim() ?? ""

    const isEmpty = content.length < 20
    const isPlaceholder = /^(empty response|error|null|undefined|\[\s*\]|\[\])$/i.test(content)
    const isJunk = !/[а-яА-Я]/.test(content)

    const valid = !isEmpty && !isPlaceholder && !isJunk

    const issues: string[] = []

    if (isEmpty) issues.push("Content too short or empty")
    if (isPlaceholder) issues.push("LLM returned placeholder text")
    if (isJunk) issues.push("Content contains no Russian text")

    return {
      valid,
      score: valid ? 0.8 : 0.1,
      issues
    }
  }
}
