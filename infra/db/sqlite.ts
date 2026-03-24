import * as sqlite3 from "sqlite3"

export const db = new sqlite3.Database("elara.db")

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS entries (
      id TEXT PRIMARY KEY,
      content TEXT,
      createdAt TEXT
    )
  `)

  db.run(`
    CREATE TABLE IF NOT EXISTS reflections (
      id TEXT PRIMARY KEY,
      entryId TEXT,
      analysis TEXT,
      createdAt TEXT
    )
  `)
})
