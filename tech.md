# Техническая записка: Elara Journal v3

## Назначение

Elara Journal — это автономная система генерации и саморефлексии текстов, реализующая цикл:

```
контекст → генерация → оценка → обновление состояния
```

Система накапливает опыт и адаптирует поведение через внутреннее состояние (`SelfState`).

---

## Архитектура

Система построена по модульному принципу с центральным orchestrator:

### `JournalEngine`

Координирует полный цикл:

* сбор контекста
* генерация записи
* embedding
* рефлексия
* оценка
* обновление состояния
* сохранение

---

## Основные компоненты

### 1. Memory (`JsonMemoryService`)

Функции:

* хранение данных (`entries`, `reflections`, `state`)
* семантический поиск (`searchSemantic`)
* формирование контекста (`buildContext`)

Хранилище:

```
data/
  entries.json
  reflections.json
  self-state.json
```

---

### 2. Generator (`AIGenerator`)

* генерирует новую запись через LLM
* использует:

  * контекст
  * `state`
  * прошлые ошибки (`issues`, `improvements`)

---

### 3. Reflector (`AIReflector`)

* анализирует запись через LLM
* возвращает:

  * `score`
  * `issues`
  * `improvements`
  * `themes`

---

### 4. Evaluator (`SimpleEvaluator`)

* базовая валидация записи
* возвращает:

  * `valid`
  * `score`

---

### 5. EmbeddingService

* преобразует текст в вектор
* используется для semantic search (cosine similarity)

---

### 6. Publisher (`ConsolePublisher`)

* вывод результата (в текущей реализации — консоль)

---

## Модель данных

### Entry

```ts
{
  id: string
  content: string
  embedding: number[]
  createdAt: Date
}
```

---

### Reflection

```ts
{
  id: string
  entryId: string
  analysis: string

  score: number
  selfScore: number

  issues: string[]
  improvements: string[]
  themes: string[]

  createdAt: Date
}
```

---

### SelfState

```ts
{
  mood: string
  themes: string[]

  identity: string[]
  insights: string[]
  patterns: string[]

  drift: number
  confidence: number
}
```

---

## Поток данных

```
Memory → Context → Generator → Entry
                     ↓
                Embedding
                     ↓
                Reflector → Reflection
                     ↓
                Evaluator
                     ↓
                updateState
                     ↓
                Memory (persist)
```

---

## Контекст (`Context`)

Формируется в `Memory.buildContext()`:

```ts
{
  recentEntries: Entry[]
  semanticMatches: Entry[]
  reflections: Reflection[]
  state: SelfState
  workingMemory: any[]
}
```

---

## Механизм обучения

Система реализует feedback loop:

1. Генерация записи
2. Рефлексия (оценка + анализ)
3. Обновление состояния:

   * `themes` ← темы из рефлексии
   * `patterns` ← проблемы (`issues`)
   * `insights` ← улучшения (`improvements`)
4. Влияние на следующую генерацию

---

## Семантический поиск

* embedding сохраняется в `Entry.embedding`
* используется `cosineSimilarity`
* применяется для поиска релевантных записей

---

## Оптимизация хранения

* embedding сжимается (`toFixed(3)`)
* нормализация при чтении (`normalizeEmbedding`)

---

## Интеграции

* LLM: `OllamaClient`
* Embedding: `VoyageEmbeddingService`

---

## Ограничения

* файловое хранилище (JSON)
* отсутствие vector DB
* зависимость от корректности LLM-ответа
* простая логика оценки

---

## Расширяемость

Система допускает:

* замену LLM
* подключение внешнего хранилища
* усложнение модели состояния
* внедрение multi-agent логики

---

## Вывод

Elara Journal представляет собой минималистичную реализацию саморефлексирующего агента с:

* семантической памятью
* динамическим состоянием
* циклом самообучения
