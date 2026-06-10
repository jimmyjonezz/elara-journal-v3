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
    id: "isolation_tape",
    label: "Синяя изолента (пожелтение, слоение)",
    patterns: ["изолент"]
  },
  {
    id: "skin_itch",
    label: "Зуд кожи / плёнка на пальцах",
    patterns: ["зуд", "плёнка на палец", "отпечатков нет"]
  },
  {
    id: "ticking",
    label: "Тиканье контроллера / 6 Гц",
    patterns: ["тикань", "6 гц"]
  },
  {
    id: "fingerprint",
    label: "Отпечаток без папиллярных линий",
    patterns: ["без папиллярн", "нечеловеческий отпечаток"]
  },
  {
    id: "solovyov",
    label: "Присутствие / голос Соловьёва",
    patterns: ["соловьёв", "соловьев"]
  },
  {
    id: "pulse_sync",
    label: "Пульс героя = пульс станции",
    patterns: ["пульс.*станци", "сердце.*стен"]
  },
  {
    id: "pressure_097",
    label: "Давление 0.97 / датчики врут",
    patterns: ["0.97"]
  },
  {
    id: "ammonia",
    label: "Аммиак / химический запах",
    patterns: ["аммиак"]
  },
  {
    id: "timer",
    label: "Таймер / обратный отсчёт",
    patterns: ["таймер", "обратный отсчёт"]
  },
  {
    id: "wall_key",
    label: "Ключ в стене",
    patterns: ["ключ в стен"]
  },
  {
    id: "grey_powder",
    label: "Серые хлопья / магнитная пыль",
    patterns: ["серые хлопья", "магнитная пыль", "серая пыль"]
  },
  {
    id: "ozone",
    label: "Озон / электрический запах",
    patterns: ["озон"]
  },
  {
    id: "biofilm",
    label: "Органическая биоплёнка / живая стена",
    patterns: ["биоплёнк", "биопленк", "органическая плёнк"]
  },
  {
    id: "solder",
    label: "Серебристый припой / чужой флюс",
    patterns: ["припой", "флюс"]
  },
  {
    id: "em_systems",
    label: "Штамп E.M. Systems, 2031",
    patterns: ["e.m. systems", "em systems", "2031"]
  },
  {
    id: "protocol_merge",
    label: "Протокол слияния / гибридизация",
    patterns: ["слияни", "гибридизаци", "нейроконтакт"]
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
