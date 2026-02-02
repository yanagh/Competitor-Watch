-- Vercel Postgres Schema for Competitor Watch
-- Run this SQL in the Vercel Postgres dashboard to set up the database

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitors (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('competitor', 'partner', 'inspiration')),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS competitor_urls (
  id SERIAL PRIMARY KEY,
  competitor_id INTEGER NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  source_type TEXT NOT NULL CHECK (source_type IN ('facebook', 'website', 'linkedin')),
  last_checked TIMESTAMP,
  last_update_url TEXT,
  last_update_date TIMESTAMP,
  last_summary TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'new_update', 'no_updates', 'error'))
);

-- Indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_competitors_user_id ON competitors(user_id);
CREATE INDEX IF NOT EXISTS idx_competitor_urls_competitor_id ON competitor_urls(competitor_id);
