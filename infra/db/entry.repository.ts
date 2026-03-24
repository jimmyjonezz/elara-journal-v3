import { db } from "./sqlite"
import { Entry } from "../../domain/entry"

export class SQLiteEntryRepository {
  save(entry: Entry): Promise<void> {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO entries VALUES (?, ?, ?)`,
        [entry.id, entry.content, entry.createdAt.toISOString()],
        err => (err ? reject(err) : resolve())
      )
    })
  }

  getRecent(limit: number): Promise<Entry[]> {
    return new Promise((resolve, reject) => {
      db.all(
        `SELECT * FROM entries ORDER BY createdAt DESC LIMIT ?`,
        [limit],
        (err, rows) => {
          if (err) reject(err)
          else resolve(rows)
        }
      )
    })
  }
}
