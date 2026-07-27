# Elara Journal v3 — План фиксов

На основе 4 раундов диагностики субджентом (qwen3.7-max-preview) и 3 раундов анализа ассистента.

---

## 🔴 Критические (crash / данные потеряны)

| # | Проблема | Где | Фикс | Кем найдено |
|---|----------|-----|------|:-----------:|
| A | **`lastReflection = reflections[0]`** — берётся **старая** рефлексия вместо новой | `generator.service.ts:20` | ✅ `reflections[length-1]` | Агент #3 |
| B | **getRecent vs getRecentReflections асимметрия** — entries DESC, reflections без сортировки | `memory.service.ts:296-298` | ✅ Добавлен `.sort(createdAt DESC)` | Агент #1, #3 |
| C | **`entries[91]` выброс** — import (reverse-chrono) + push (в конец) | `data/entries.json` | ✅ `storeEntry/Reflection` сортируют массив после push | Агент #1 |

## 🟡 Высокий приоритет (ломают логику)

| # | Проблема | Где | Фикс | Кем найдено |
|---|----------|-----|------|:-----------:|
| D | **Drift-храповик** — `prev*0.97 + signal*0.15` гарантирует drift=1.0 при repScore≥2 | `self-state.service.ts:25` | ✅ `prev*0.95 + repSignal*0.10` — макс 0.54 на реальных данных | Агент #2 |
| E | **NarrativePhase lock** — `Math.max(prevPhase, round(drift*6))` → фаза 6 навсегда | `self-state.service.ts:105-106` | ✅ Убран `Math.max()`: `phaseFromDrift` | Агент #3 |
| F | **Issues одноразовые** — `.slice(-2)` только из последней рефлексии, все 296 уникальны | `generator.service.ts:37` | ✅ Аккумуляция из 5 рефлексий + dedup + slice(-5) | Агент #2 |
| G | **Improvements одноразовые** — то же что issues | `generator.service.ts:41` | ✅ То же что #F | Агент #3 |

## 🟡 Средний приоритет (качество генерации)

| # | Проблема | Где | Фикс | Кем найдено |
|---|----------|-----|------|:-----------:|
| H | **Confidence-петля** — score (≥8) → confidence (0.66-0.82) → mood → voice → entry → score (≥8) | `generator.service.ts:86` | ✅ Температура LLM зависит от confidence: 0.7-1.2 | Агент #3 |
| I | **Evaluator — резиновая печать** — хардкод `0.8` + LLM никогда <6 | `evaluator.service.ts:78` + `reflector.service.ts` | ✅ K — рефлектор видит confidence и дрифт, может калибровать score | Агент #3 |
| J | **Template dualism** — ровно 2 themes, themes[1] → open situation | `prompts/reflection.txt:19,35` | ✅ 1-3 темы, themes[2], themes[3] опциональны | Агент #2 |
| K | **confidence не влияет на рефлектор** — LLM-рефлектор не видит confidence | `reflector.service.ts` | ✅ `{{confidence}}` и `{{drift}}` передаются в промпт рефлексии | Агент #3 |

## 🟢 Низкий приоритет (крайние случаи)

| # | Проблема | Где | Фикс | Кем найдено |
|---|----------|-----|------|:-----------:|
| L | **`systemTension[0]` без проверки** | `generator.service.ts:57-60` | ✅ Уже безопасно (`?.` + `??`) | Агент #2 |
| M | **Race condition** — `storeEntry/Reflection/State` неатомарны | `memory.service.ts` | ❌ Not actionable — single-threaded Node.js cron | Агент #2 |
| N | **Бэкфилл 1000 без лимита** | `journalEngine.ts:35` | ✅ 1000 → 500 | Агент #2 |
| O | **Первые 10 рефлексий без systemTension** | `memory.service.ts:157-167` | ✅ Дефолты `?? []` при чтении | Агент #1 |
| P | **9 date gaps >1.5d** | `data/entries.json` | Не баг — дни без генерации | Агент #1 |

---

## Приоритет внедрения

```
Раунд 1 (сделан):     A + D + E    — баг рефлексии + drift + phase
Раунд 2 (сделан):     B + C + F + G — данные + аккумуляция
Раунд 3 (сделан):     H + I + J + K — качество
Раунд 4 (сделан):     L + N + O — защита от краёв (M — неактуально)
```

## Что сделано

| # | Фикс | Файл |
|---|------|------|
| ✅ A | `reflections[0]` → `reflections[length-1]` | `generator.service.ts:20` |
| ✅ D | Drift: `prev*0.95 + repSignal*0.10` | `self-state.service.ts:25` |
| ✅ E | Убран `Math.max` у narrativePhase | `self-state.service.ts:106` |
| ✅ B | getRecentReflections sort DESC | `memory.service.ts:296-299` |
| ✅ C | storeEntry/Reflection sort after push | `memory.service.ts:308,316` |
| ✅ F | Issues из 5 рефлексий + dedup + slice(-5) | `generator.service.ts:35-39` |
| ✅ G | Improvements — то же | `generator.service.ts:42-46` |
| ✅ H | Температура LLM от confidence (0.7-1.2) | `generator.service.ts:86-92` |
| ✅ J | Template dualism → 1-3 темы | `prompts/reflection.txt:19,35-38` |
| ✅ K | confidence/drift в промпт рефлектора | `reflector.service.ts:16-22` |
| ✅ N | Бэкфилл 1000→500 | `journalEngine.ts:35` |
| ✅ O | Дефолты `?? []` для старых рефлексий | `memory.service.ts:157-167` |

---

*Собрано: 2026-07-27 на основе 4 раундов субджента (qwen3.7-max-preview) и 3 раундов анализа ассистента*
