// services/motif.service.ts

import * as fs from "fs"
import * as path from "path"

import { MotifState, MotifEntry } from "../domain/motif-state"
import { Entry } from "../domain/entry"

const EXHAUSTION_THRESHOLD = 5
const DECAY_PER_ABSENCE = 0.9
const HIT_INCREMENT = 1.5

const MOTIF_DEFINITIONS: Omit<MotifEntry, "count" | "exhaustion">[] = [
  {
    id: "coffee_tea",
    label: "Кофе / чай / кружка на столе",
    patterns: ["кофе", "чай", "кружк"]
  },
  {
    id: "window_light",
    label: "Свет из окна / уличный фонарь / рассвет",
    patterns: ["окн", "фонар", "свет.*улиц", "рассвет", "закат"]
  },
  {
    id: "phone_call",
    label: "Звонок / телефон / сообщение",
    patterns: ["звон", "телефон", "сообщени", "эсэмэс", "позвони"]
  },
  {
    id: "door_entrance",
    label: "Дверь / вход / порог / коридор",
    patterns: ["двер", "вход", "порог", "коридор"]
  },
  {
    id: "bed_sleep",
    label: "Кровать / подушка / лечь спать / заснуть",
    patterns: ["кроват", "подушк", "лечь спать", "засну", "ложусь", "постел"]
  },
  {
    id: "writing_process",
    label: "Письмо / страница / экран / текст / глава",
    patterns: ["страниц", "экран", "текст", "глав", "роман", "пис"]
  },
  {
    id: "rain_weather",
    label: "Дождь / погода / туман / ветер",
    patterns: ["дожд", "погод", "туман", "ветер", "сырост"]
  },
  {
    id: "dream_letters",
    label: "Буквы / символы / потолок / вязь",
    patterns: ["букв", "символ", "потолок", "вязь", "трещин"]
  },
  {
    id: "whispers_voice",
    label: "Шёпот / голос / тишина / дыхание",
    patterns: ["шёпот", "шепот", "голос", "тишин", "дыша", "дыхани"]
  },
  {
    id: "city_sounds",
    label: "Городские звуки / соседи / лифт / улица",
    patterns: ["лифт", "сосед", "улиц", "шум.*город", "машин"]
  },
  {
    id: "food_meal",
    label: "Еда / завтрак / обед / ужин",
    patterns: ["завтрак", "обед", "ужин", "ела", "хлеб"]
  },
  {
    id: "stare_observation",
    label: "Ощущение наблюдения / взгляд / присутствие",
    patterns: ["наблюда", "взгляд", "присутстви", "чужи.*глаз", "смотрит"]
  },
  {
    id: "mom_family",
    label: "Мама / семья / родственники",
    patterns: ["мам", "пап", "семь", "родственник"]
  },
  {
    id: "cold_warm",
    label: "Холод / тепло / температура тела / озноб",
    patterns: ["холод", "тепл", "озноб", "мёрзн", "зябк"]
  },
  {
    id: "memory_forget",
    label: "Память / забыть / вспомнить / помню",
    patterns: ["памят", "забы", "вспомн", "помн", "помню"]
  },
  {
    id: "mirror_reflection",
    label: "Зеркало / отражение / двойник",
    patterns: ["зеркал", "отражени", "двойник", "себя в"]
  }
]

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
      totalScanned: 0
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
  // -----------------------

  backfill(entries: Entry[]): void {
    for (const entry of entries) {
      this.scanEntry(entry, true)
    }
    this.save()
  }

  // -----------------------
  // Scan
  // -----------------------

  scanEntry(entry: Entry, suppressDecay = false): void {
    const content = entry.content?.toLowerCase() ?? ""

    // Для каждого мотива проверяем все паттерны
    for (const motif of Object.values(this.state.motifs)) {
      const matched = motif.patterns.some(pattern => {
        if (pattern.includes("*")) {
          // Поддержка простого wildcard
          const parts = pattern.split("*").map(p => p.toLowerCase())
          return parts.every(p => p === "" || content.includes(p))
        }
        return content.includes(pattern.toLowerCase())
      })

      if (matched) {
        motif.count++
        motif.exhaustion = Math.min(10, motif.exhaustion + HIT_INCREMENT)
      } else if (!suppressDecay) {
        motif.exhaustion = Math.max(0, motif.exhaustion * DECAY_PER_ABSENCE)
      }
    }

    this.state.totalScanned++
  }

  scanEntryWithReflection(entry: Entry, evolutionSignals: string[]): void {
    this.scanEntry(entry)

    // Эволюция мотива снижает exhaustion
    for (const motif of Object.values(this.state.motifs)) {
      const hasEvolution = evolutionSignals.some(signal =>
        signal.toLowerCase().includes(motif.id) ||
        motif.patterns.some(p => signal.toLowerCase().includes(p))
      )
      if (hasEvolution) {
        motif.exhaustion = Math.max(0, motif.exhaustion - 3)
      }
    }
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
