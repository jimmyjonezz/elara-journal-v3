// services/motif.service.ts

import * as fs from "fs"
import * as path from "path"

import { MotifState, MotifEntry } from "../domain/motif-state"
import { Entry } from "../domain/entry"

const EXHAUSTION_THRESHOLD = 5
const DECAY_PER_ABSENCE = 0.9
const HIT_INCREMENT = 1.5

// [STAGE 2] Паттерны — regex-фрагменты, применяются с границами слов
// через lookaround по кириллице (JS \b для кириллицы не работает).
// Это чинит баг: подстрока "ела" матчера "смотрела/сидыла/белая" →
// food_meal был 22/22 при реальном отсутствии еды.
const MOTIF_DEFINITIONS: Omit<MotifEntry, "count" | "exhaustion">[] = [
  // --- Образы аттрактора (их не было — {{avoid}} банил не то) ---
  {
    id: "salt_marker",
    label: "Соль / крупинки / налёт",
    patterns: ["сол[ьюи]", "крупин\\w*", "налёт\\w*"]
  },
  {
    id: "old_woman",
    label: "Старушка / старуха / старая женщина",
    patterns: ["старушк\\w*", "старух\\w*", "старая\\w*\\s*женщин\\w*"]
  },
  {
    id: "boat_shore",
    label: "Лодка / берег / причал / набережная",
    patterns: ["лодк\\w*", "берег\\w*", "причал\\w*", "набережн\\w*"]
  },
  {
    id: "drop_water",
    label: "Капля / капает / капнула",
    patterns: ["капл\\w*", "капае\\w*", "капнул\\w*"]
  },
  {
    id: "white_stripe",
    label: "Белая полоса / линия / клеймо / метка",
    patterns: ["бел\\w*\\s*полос\\w*", "полос\\w*\\s*на", "клейм\\w*", "метк\\w*"]
  },
  {
    id: "letter_k",
    label: "Буква «К» / клавиши / клавиатура",
    patterns: ["клавиш\\w*", "клавиатур\\w*", "«к»", "букв\\w*\\s*«?к»?"]
  },
  // --- Бытовые мотивы (границы слов починены) ---
  {
    id: "coffee_tea",
    label: "Кофе / чай / кружка на столе",
    patterns: ["кофе\\w*", "чай\\w*", "кружк\\w*", "чашк\\w*", "стакан\\w*"]
  },
  {
    id: "window_light",
    label: "Свет из окна / уличный фонарь / рассвет",
    patterns: ["окн\\w*", "фонар\\w*", "рассвет\\w*", "закат\\w*", "свет\\w*"]
  },
  {
    id: "phone_call",
    label: "Звонок / телефон / сообщение",
    patterns: ["звон\\w*", "телефон\\w*", "сообщени\\w*", "эсэмэск\\w*", "позвон\\w*"]
  },
  {
    id: "door_entrance",
    label: "Дверь / вход / порог / коридор",
    patterns: ["двер\\w*", "вход\\w*", "порог\\w*", "коридор\\w*"]
  },
  {
    id: "bed_sleep",
    label: "Кровать / подушка / лечь спать / заснуть",
    patterns: ["кроват\\w*", "подушк\\w*", "постел\\w*", "засыпа\\w*", "засну\\w*", "лечь\\s*спать", "спал\\w*"]
  },
  {
    id: "writing_process",
    label: "Письмо / страница / экран / текст / глава",
    patterns: ["страниц\\w*", "экран\\w*", "текст\\w*", "глав\\w*", "роман\\w*", "писа\\w*", "письмо\\w*", "запис\\w*"]
  },
  {
    id: "rain_weather",
    label: "Дождь / погода / туман / ветер",
    patterns: ["дожд\\w*", "погод\\w*", "туман\\w*", "ветер\\w*", "веял\\w*", "сырост\\w*"]
  },
  {
    id: "dream_letters",
    label: "Буквы / символы / потолок / вязь",
    patterns: ["букв\\w*", "символ\\w*", "потол\\w*", "вяз[ьи]\\w*", "трещин\\w*"]
  },
  {
    id: "whispers_voice",
    label: "Шёпот / голос / тишина / дыхание",
    patterns: ["шёпот\\w*", "шепот\\w*", "голос\\w*", "тишин\\w*", "дыхан\\w*", "дыш\\w*"]
  },
  {
    id: "city_sounds",
    label: "Городские звуки / соседи / лифт / улица",
    patterns: ["лифт\\w*", "сосед\\w*", "улиц\\w*", "шум\\w*", "машин\\w*"]
  },
  {
    id: "food_meal",
    label: "Еда / завтрак / обед / ужин",
    patterns: ["завтрак\\w*", "обед\\w*", "ужин\\w*", "ел[аи]", "хлеб\\w*"]
  },
  {
    id: "stare_observation",
    label: "Ощущение наблюдения / взгляд / присутствие",
    patterns: ["наблюда\\w*", "взгляд\\w*", "присутстви\\w*", "чуж\\w*\\s*глаз\\w*", "смотрит\\w*"]
  },
  {
    id: "mom_family",
    label: "Мама / семья / родственники",
    patterns: ["мам\\w*", "пап\\w*", "семь\\w*", "родственник\\w*"]
  },
  {
    id: "cold_warm",
    label: "Холод / тепло / температура тела / озноб",
    patterns: ["холод\\w*", "тепл\\w*", "озноб\\w*", "мёрз\\w*", "зябк\\w*"]
  },
  {
    id: "memory_forget",
    label: "Память / забыть / вспомнить / помню",
    patterns: ["памят\\w*", "забы\\w*", "вспомн\\w*", "помн\\w*"]
  },
  {
    id: "mirror_reflection",
    label: "Зеркало / отражение / двойник",
    patterns: ["зеркал\\w*", "отражени\\w*", "двойник\\w*", "себя\\s*в\\s*зеркал\\w*"]
  }
]

// Граница слова для кириллицы: \b в JS работает только для ASCII.
// ВАЖНО: \w тоже ASCII-only — не содержит кириллические буквы.
// Паттерн "старушк\w*" против "старушка"": \w* съедает 0 символов,
// lookahead (?![а-яёё]) режет следующую "а" → совпадения не было бы
// никогда. Поэтому \w в паттернах подменяется на кириллический класс.
function matchWord(content: string, pattern: string): boolean {
  const re = pattern.replace(/\\w/g, "[а-яё]")
  return new RegExp(`(?<![а-яёё])(${re})(?![а-яёё])`, "i").test(content)
}

export class MotifTracker {
  private filePath = path.resolve("data/motif-state.json")

  private state: MotifState

  constructor() {
    this.state = this.read()
  }

  // -----------------------
  // Persistence
  // -----------------------

  private initialState(): MotifState {
    return {
      motifs: Object.fromEntries(
        MOTIF_DEFINITIONS.map(m => [m.id, { ...m, count: 0, exhaustion: 0 }])
      ),
      totalScanned: 0,
      scannedIds: []
    }
  }

  private read(): MotifState {
    if (!fs.existsSync(this.filePath)) {
      return this.initialState()
    }

    try {
      const raw = JSON.parse(fs.readFileSync(this.filePath, "utf-8"))
      const saved = raw as MotifState

      // Объединяем сохранённое с определениями (на случай добавления новых мотивов)
      const merged = this.initialState()
      for (const [id, savedEntry] of Object.entries(saved.motifs || {})) {
        if (merged.motifs[id]) {
          merged.motifs[id].count = (savedEntry as MotifEntry).count ?? 0
          merged.motifs[id].exhaustion = (savedEntry as MotifEntry).exhaustion ?? 0
        }
      }
      merged.totalScanned = saved.totalScanned ?? 0
      // [STAGE 2] сохраняем список отсканированных записей
      merged.scannedIds = saved.scannedIds ?? []

      return merged
    } catch {
      return this.initialState()
    }
  }

  save(): void {
    fs.mkdirSync(path.dirname(this.filePath), { recursive: true })
    fs.writeFileSync(this.filePath, JSON.stringify(this.state, null, 2))
  }

  // -----------------------
  // Backfill (сканирование существующих записей при старте)
  // [STAGE 2] Идемпотентно: только записи, чьих id ещё нет в scannedIds.
  // Раньше in-memory флаг сбрасывался каждый CI-прогон → пересчёт всех
  // записей ежедневно → totalScanned 2037 при 22 записях.
  // -----------------------

  backfill(entries: Entry[]): void {
    const scanned = new Set(this.state.scannedIds ?? [])
    const fresh = entries.filter(e => !scanned.has(e.id))

    for (const entry of fresh) {
      this.scanEntry(entry, true)
    }

    this.state.scannedIds = [
      ...scanned,
      ...fresh.map(e => e.id)
    ]
    this.save()
  }

  // -----------------------
  // Scan
  // -----------------------

  scanEntry(entry: Entry, suppressDecay = false): void {
    const content = entry.content?.toLowerCase() ?? ""

    // [STAGE 2] Границы слов по кириллице вместо content.includes()
    for (const motif of Object.values(this.state.motifs)) {
      const matched = motif.patterns.some(pattern => matchWord(content, pattern))

      if (matched) {
        motif.count++
        motif.exhaustion = Math.min(10, motif.exhaustion + HIT_INCREMENT)
      } else if (!suppressDecay) {
        motif.exhaustion = Math.max(0, motif.exhaustion * DECAY_PER_ABSENCE)
      }
    }

    this.state.totalScanned++
  }

  scanEntryWithReflection(entry: Entry): void {
    this.scanEntry(entry)
    // [STAGE 2] Эволюция-скидка убрана: критик обсуждает именно образы
    // аттрактора (соль/капля), и скидка −3 выводила их из {{avoid}},
    // хотя это самые затёртые мотивы (writing_process снижался 22/22).
  }

  // -----------------------
  // Query
  // -----------------------

  getExhaustedMotifs(): string[] {
    return Object.values(this.state.motifs)
      .filter(m => m.exhaustion >= EXHAUSTION_THRESHOLD)
      .sort((a, b) => b.exhaustion - a.exhaustion)
      .map(m => `[ПОВТОР МОТИВА] ${m.label} — уже использован ${m.count} раз(а)`)
  }

  getMotifSummary(): string {
    const active = Object.values(this.state.motifs)
      .filter(m => m.exhaustion >= EXHAUSTION_THRESHOLD)
      .map(m => `${m.label}: ${m.exhaustion.toFixed(1)}`)
      .join("; ")

    if (!active) return ""

    return `[ИСТОЩЁННЫЕ МОТИВЫ] ${active}`
  }
}
