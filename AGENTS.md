# AGENTS.md — Elara Journal v3

## Обзор проекта

Elara — экспериментальная система саморефлексии на базе LLM. Генерирует записи, анализирует их и адаптирует своё поведение со временем.

```
контекст → генерация → рефлексия → обновление состояния → повтор
```

---

## Команды

### Установка и запуск

```bash
npm install
npm start
# или
npx ts-node main.ts
```

### Сборка

```bash
npx tsc --noEmit   # проверка типов
```

### Тестирование

Тестовый фреймворк не настроен. Для добавления тестов рекомендуется **Vitest**:

```bash
npm install -D vitest
```

Пример конфигурации в `vite.config.ts`:

```ts
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['**/*.test.ts', '**/*.spec.ts'],
  },
})
```

Запуск тестов:

```bash
npx vitest run           # все тесты
npx vitest run single    # один тест (по имени файла)
npx vitest watch         # watch mode
```

---

## Соглашения по коду

### Стиль именования

| Сущность | Формат | Пример |
|----------|--------|--------|
| Файлы | camelCase | `memory.service.ts`, `vector.utils.ts` |
| Интерфейсы | camelCase (без суффикса) | `generator.ts`, `memory.ts` |
| Классы | PascalCase | `JsonMemoryService`, `AIReflector` |
| Функции/методы | camelCase | `buildContext`, `searchSemantic` |
| Типы (type/interface) | PascalCase | `Entry`, `Reflection`, `SelfState` |

### Организация импортов

Порядок групп (пустая строка между группами):

```ts
// 1. Внешние (Node.js, npm)
import * as fs from "fs"
import * as path from "path"

// 2. Внутренние — interfaces
import { Memory } from "../interfaces/memory"

// 3. Внутренние — domain
import { Entry } from "../domain/entry"

// 4. Внутренние — services
import { updateState } from "../services/self-state.service"

// 5. Внутренние — infra
import { OllamaClient } from "../infra/llm/ollama.client"

// 6. Внутренние — utils
import { cosineSimilarity } from "../utils/vector.utils"
```

### Комментарии

- Заголовок файла: `// services/memory.service.ts` (путь относительно корня проекта)
- Разделители секций внутри файла:

```ts
// -----------------------
// Internal helpers
// -----------------------
```

### Типизация

- **Явные типы** для аргументов и возвращаемых значений обязательны
- `any` допустим только в конструкторах сервисов (для внедрения зависимостей)
- TypeScript strict mode включён в `tsconfig.json`

```ts
// Хорошо
async getRecent(limit: number): Promise<Entry[]>

// Избегать
async getRecent(limit)  // без типа
```

### Обработка ошибок

- Использовать `try/catch` с пустым catch для игнорирования ошибок
- Логировать через `console.error`
- Возвращать fallback-значения при ошибках

```ts
// Хорошо
try {
  const raw = JSON.parse(fs.readFileSync(this.filePath, "utf-8"))
  return raw
} catch {
  return []
}

// С логированием
} catch (e: any) {
  console.error("EMBED ERROR:", e?.message || e)
  throw e
}
```

### Приватность

- Все поля классов должны быть `private` или `protected`
- Использовать `private` для инъектируемых зависимостей в конструкторе

```ts
export class JsonMemoryService implements Memory {
  constructor(private embedding: EmbeddingService) {}
}
```

### Архитектура

```
/core           — orchestrator (JournalEngine)
/interfaces     — контракты (Generator, Memory, Reflector и т.д.)
/domain         — типы данных (Entry, Reflection, SelfState, Context)
/services       — бизнес-логика (JsonMemoryService, AIGenerator, AIReflector)
/infra          — внешние интеграции (ollama.client, openai.client, sqlite)
/utils          — утилиты (vector.utils, json.utils, embedding.utils)
```

### Паттерн Интерфейс vs Реализация

- Интерфейсы хранятся в `/interfaces`
- Реализации — в `/services` или `/infra`
- Имена классов реализации: префикс + имя интерфейса

```ts
// interfaces/memory.ts
export interface Memory {
  getRecent(limit: number): Promise<Entry[]>
}

// services/memory.service.ts
export class JsonMemoryService implements Memory {
  // реализация
}
```

### Форматирование

- 2 пробела для отступов
- JSON-файлы с отступами `null, 2` (pretty print)
- Использовать точечную нотацию для импортов

---

## Структура данных

### Entry

```ts
{
  id: string
  content: string
  embedding: number[]
  createdAt: Date
}
```

### Reflection

```ts
{
  id: string
  entryId: string
  analysis: string
  score: number
  issues: string[]
  improvements: string[]
  themes: string[]
  createdAt: Date
}
```

### SelfState

```ts
{
  mood: "calm" | "curious" | "reflective" | "gentle"
  themes: string[]
  insights: string[]
  drift: number
  confidence: number
}
```

---

## Окружение (.env)

Обязательные переменные:

```
OLLAMA_API_KEY=<key>
OLLAMA_MODEL=<model-name>
VOYAGE_API_KEY=<key>  # для embedding (опционально)
```

---

## Ограничения

- Файловое хранилище (JSON) — не масштабируется
- Нет векторной БД
- Простая эвристика оценки
- Зависимость от корректности LLM-ответа