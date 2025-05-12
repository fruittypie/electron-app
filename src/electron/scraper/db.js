import Database from 'better-sqlite3';
export const db = new Database('./items.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT UNIQUE,
    status TEXT,
    last_checked TEXT
  )
`);

// Look for the item in the db
export function getItem(title) {
  return db.prepare('SELECT * FROM items WHERE title = ?').get(title);
}

// Update the db info
export function upsertItem(title, status) {
  const existing = getItem(title);
  if (!existing) {
    return db.prepare(
      "INSERT INTO items (title, status, last_checked) VALUES (?, ?, datetime('now'))"
    ).run(title, status);
  } else {
    return db.prepare(
      "UPDATE items SET status = ?, last_checked = datetime('now') WHERE title = ?"
    ).run(status, title);
  }
}