# AGENTS.md — Elara Journal v3

## Сборка / Запуск / Тесты

```bash
npm install              # установка зависимостей
npx ts-node main.ts      # запуск приложения (шага сборки нет)
```

- **Тестовый фреймворк не настроен.** Линтеры и форматтеры отсутствуют.
- **Шага сборки нет** — TypeScript выполняется напрямую через `ts-node`.
- **CI/CD пайплайн отсутствует.**

## Структура проекта

```
core/            — JournalEngine (оркестратор)
services/        — Реализации сервисов (*.service.ts)
infra/           — Внешние клиенты: LLM (ollama, voyage), БД (sqlite)
interfaces/      — TypeScript-интерфейсы для всех контрактов сервисов
domain/          — Доменные типы: Entry, Reflection, Context, SelfState
utils/           — Чистые утилиты (*.utils.ts)
data/            — JSON-хранилище (entries, reflections, state, embeddings)
prompts/         — Текстовые файлы промптов для LLM
main.ts          — Точка входа
```

## Стиль кода

### Импорт
- **Только относительные пути**, без `.ts`: `import { Memory } from "../interfaces/memory"`
- **Без `import type`** — использовать обычный `import` даже для типов
- **Namespace-импорт** для встроенных модулей Node: `import * as fs from "fs"`
- **Именованный импорт** для всего остального
- Группировка: внешние → внутренние (domain/interfaces) → соседние

### Форматирование
- **Без точек с запятой** — самое строгое правило во всей кодовой базе
- **Двойные кавычки** для всех строк — одинарные запрещены
- **2 пробела** для отступов
- **Без висячих запятых** в объектах и вызовах функций
- **Шаблонные строки** для многострочных значений (промпты, SQL)

### Именование
| Категория | Паттерн | Пример |
|---|---|---|
| Классы | PascalCase | `JournalEngine`, `JsonMemoryService`, `OllamaClient` |
| Интерфейсы | PascalCase (существительное) | `Memory`, `Generator`, `Context` |
| Типы (type alias) | PascalCase | `Entry`, `EvaluationResult`, `Prompt` |
| Функции/переменные | camelCase | `extractJSON`, `recentEntries` |
| Файлы сервисов | `kebab-case.service.ts` | `memory.service.ts` |
| Файлы клиентов | `kebab-case.client.ts` | `ollama.client.ts` |
| Доменные файлы | `kebab-case.ts` | `self-state.ts` |
| Файлы утилит | `kebab-case.utils.ts` | `vector.utils.ts` |

### Типы
- **Явные возвращаемые типы** на всех публичных методах: `Promise<Entry>`, `Promise<void>`
- **Strict mode включён** (`tsconfig.json`: `"strict": true`)
- **Union literal типы** для enum-подобных значений: `mood: "calm" | "curious" | "reflective"`
- **`any` допустим** для ответов внешних API и LLM-пейлоадов
- Использовать `?.` (optional chaining), `??` (nullish coalescing), `!` (non-null assertion) по необходимости

### Обработка ошибок
- **Try/catch с fallback-значениями** — самый частый паттерн
- **Голый `catch {}`** для парсинга JSON (без переменной ошибки)
- **Типизированный catch** с логированием внешних сервисов: `catch (e: any) { console.error(...) }`
- **Бросать `Error`** при фатальных условиях: `throw new Error("Embedding failed")`
- **Ранний return** при невалидном состоянии: `if (!evaluation.valid) return`

### Комментарии
- **Только `//`** — без JSDoc, без `/** */`
- **Русские комментарии — норма** — не переводить и не менять
- **Разделители секций**: `// -----------------------`
- **Заголовок файла**: `// filename.ts` в начале файла
- Логи и сообщения об ошибках — на английском

### Архитектурные паттерны
- **Constructor dependency injection** с сокращением `private`:
  ```typescript
  constructor(private memory: Memory, private generator: Generator) {}
  ```
- **Interface-driven дизайн** — у каждого сервиса есть интерфейс в `interfaces/`
- **Чистые функции** для доменной логики (напр. `updateState` в `self-state.service.ts`)
- **Только `async/await`** — без `.then()` (кроме обёрток над Promise)
- **Синхронный файловый I/O** для JSON-хранилища (`fs.readFileSync`/`fs.writeFileSync`)

### Переменные окружения
- `OLLAMA_API_KEY`, `OLLAMA_MODEL` — конфигурация LLM
- `VOYAGE_API_KEY`, `VOYAGE_MODEL` — конфигурация эмбеддингов

### Примечания
- **SQLite-код существует** в `infra/db/`, но НЕ подключён к приложению. JSON-файлы — активный слой хранения.
- **`SelfState` дублируется** в `domain/context.ts` и `domain/self-state.ts` — каноничный вариант второй.
- Эмбеддинги сжимаются до 3 знаков после запятой через `+v.toFixed(3)` для экономии места.
- Фреймворка логирования нет — использовать `console.log` и `console.error`.
