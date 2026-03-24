// ---------- /services/memory.service.ts ----------
export class SQLiteMemoryService {
  constructor(private repo: SQLiteEntryRepository) {}

  async getRecent(limit: number) {
    return this.repo.getRecent(limit)
  }

  async searchSemantic() {
    return []
  }

  async storeEntry(entry) {
    await this.repo.save(entry)
  }

  async storeReflection() {}

  async buildContext() {
    return {
      recentEntries: await this.getRecent(5),
      semanticMatches: [],
      workingMemory: []
    }
  }
}
