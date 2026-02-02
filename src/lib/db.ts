import { sql } from '@vercel/postgres';

export interface Competitor {
  id: number;
  user_id: number;
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

export interface User {
  id: number;
  email: string;
  password_hash: string;
  created_at: string;
}

// Initialize tables (run once on first deployment)
export async function initializeTables() {
  await sql`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS competitors (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('competitor', 'partner', 'inspiration')),
      created_at TIMESTAMP DEFAULT NOW()
    )
  `;

  await sql`
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
    )
  `;
}

// User operations
export async function createUser(email: string, passwordHash: string): Promise<User | null> {
  try {
    const result = await sql<User>`
      INSERT INTO users (email, password_hash)
      VALUES (${email}, ${passwordHash})
      RETURNING id, email, password_hash, created_at
    `;
    return result.rows[0] || null;
  } catch {
    return null;
  }
}

export async function getUserByEmail(email: string): Promise<User | null> {
  const result = await sql<User>`
    SELECT id, email, password_hash, created_at
    FROM users
    WHERE email = ${email}
  `;
  return result.rows[0] || null;
}

export async function getUserById(id: number): Promise<User | null> {
  const result = await sql<User>`
    SELECT id, email, password_hash, created_at
    FROM users
    WHERE id = ${id}
  `;
  return result.rows[0] || null;
}

// Competitor operations
export async function getCompetitorsWithUrls(userId: number): Promise<DashboardItem[]> {
  const result = await sql<DashboardItem>`
    SELECT
      c.id as competitor_id,
      c.name as competitor_name,
      c.type as competitor_type,
      u.id as url_id,
      u.url,
      u.source_type,
      u.last_checked,
      u.last_update_url,
      u.last_update_date,
      u.last_summary,
      u.status
    FROM competitors c
    LEFT JOIN competitor_urls u ON c.id = u.competitor_id
    WHERE c.user_id = ${userId}
    ORDER BY c.name, u.source_type
  `;
  return result.rows;
}

export async function createCompetitor(
  userId: number,
  name: string,
  type: string
): Promise<number | null> {
  const result = await sql`
    INSERT INTO competitors (user_id, name, type)
    VALUES (${userId}, ${name}, ${type})
    RETURNING id
  `;
  return result.rows[0]?.id || null;
}

export async function deleteCompetitor(competitorId: number, userId: number): Promise<boolean> {
  // First delete associated URLs
  await sql`DELETE FROM competitor_urls WHERE competitor_id = ${competitorId}`;
  // Then delete the competitor, ensuring it belongs to the user
  const result = await sql`
    DELETE FROM competitors
    WHERE id = ${competitorId} AND user_id = ${userId}
  `;
  return result.rowCount !== null && result.rowCount > 0;
}

// URL operations
export async function createCompetitorUrl(
  competitorId: number,
  url: string,
  sourceType: string
): Promise<number | null> {
  const result = await sql`
    INSERT INTO competitor_urls (competitor_id, url, source_type)
    VALUES (${competitorId}, ${url}, ${sourceType})
    RETURNING id
  `;
  return result.rows[0]?.id || null;
}

export async function getCompetitorUrls(userId: number, urlId?: number): Promise<CompetitorUrl[]> {
  if (urlId) {
    // Get single URL, but verify it belongs to user's competitor
    const result = await sql<CompetitorUrl>`
      SELECT u.*
      FROM competitor_urls u
      JOIN competitors c ON u.competitor_id = c.id
      WHERE u.id = ${urlId} AND c.user_id = ${userId}
    `;
    return result.rows;
  } else {
    // Get all URLs for user's competitors
    const result = await sql<CompetitorUrl>`
      SELECT u.*
      FROM competitor_urls u
      JOIN competitors c ON u.competitor_id = c.id
      WHERE c.user_id = ${userId}
    `;
    return result.rows;
  }
}

export async function updateCompetitorUrl(
  urlId: number,
  lastChecked: string,
  contentUrl: string | null,
  hasNew: boolean,
  summary: string | null,
  status: string
): Promise<void> {
  if (hasNew) {
    await sql`
      UPDATE competitor_urls
      SET
        last_checked = ${lastChecked},
        last_update_url = COALESCE(${contentUrl}, last_update_url),
        last_update_date = ${lastChecked},
        last_summary = ${summary},
        status = ${status}
      WHERE id = ${urlId}
    `;
  } else {
    await sql`
      UPDATE competitor_urls
      SET
        last_checked = ${lastChecked},
        last_update_url = COALESCE(${contentUrl}, last_update_url),
        status = ${status}
      WHERE id = ${urlId}
    `;
  }
}
