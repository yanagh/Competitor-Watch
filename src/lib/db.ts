import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'competitors.db');

// Ensure data directory exists
import fs from 'fs';
const dataDir = path.dirname(dbPath);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS competitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('competitor', 'partner', 'inspiration')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS competitor_urls (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    competitor_id INTEGER NOT NULL,
    url TEXT NOT NULL,
    source_type TEXT NOT NULL CHECK (source_type IN ('facebook', 'website', 'linkedin')),
    last_checked DATETIME,
    last_update_url TEXT,
    last_update_date DATETIME,
    last_summary TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'new_update', 'no_updates', 'error')),
    FOREIGN KEY (competitor_id) REFERENCES competitors(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
`);

export default db;

export interface Competitor {
  id: number;
  name: string;
  type: 'competitor' | 'partner' | 'inspiration';
  created_at: string;
}

export interface CompetitorUrl {
  id: number;
  competitor_id: number;
  url: string;
  source_type: 'facebook' | 'website' | 'linkedin';
  last_checked: string | null;
  last_update_url: string | null;
  last_update_date: string | null;
  last_summary: string | null;
  status: 'pending' | 'new_update' | 'no_updates' | 'error';
}

export interface DashboardItem {
  competitor_id: number;
  competitor_name: string;
  competitor_type: string;
  url_id: number;
  url: string;
  source_type: string;
  last_checked: string | null;
  last_update_url: string | null;
  last_update_date: string | null;
  last_summary: string | null;
  status: string;
}
