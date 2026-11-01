import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

export function openDb(dataDir) {
  fs.mkdirSync(dataDir, { recursive: true });
  const db = new DatabaseSync(path.join(dataDir, 'valueforge.db'));
  db.exec(`
    PRAGMA journal_mode = WAL;
    PRAGMA busy_timeout = 5000;
    PRAGMA foreign_keys = ON;
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      client_id TEXT NOT NULL,
      name TEXT NOT NULL,
      audience TEXT NOT NULL DEFAULT '',
      product TEXT NOT NULL DEFAULT '',
      idea TEXT NOT NULL DEFAULT '',
      roi TEXT NOT NULL DEFAULT '{}',
      is_sample INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS projects_client ON projects (client_id, updated_at DESC);
    CREATE TABLE IF NOT EXISTS interviews (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      label TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS interviews_project ON interviews (project_id, created_at);
  `);
  return db;
}

export function purgeOld(db, days) {
  return db.prepare('DELETE FROM projects WHERE updated_at < ?').run(Date.now() - days * 86400000).changes;
}
