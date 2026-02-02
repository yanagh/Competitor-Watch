import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

function detectSourceType(url: string): 'facebook' | 'website' | 'linkedin' {
  if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
  if (url.includes('linkedin.com')) return 'linkedin';
  return 'website';
}

export async function GET() {
  try {
    const competitors = db.prepare(`
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
      ORDER BY c.name, u.source_type
    `).all();

    return NextResponse.json(competitors);
  } catch (error) {
    console.error('Failed to fetch competitors:', error);
    return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, type, urls } = body;

    if (!name || !type || !urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['competitor', 'partner', 'inspiration'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Insert competitor
    const insertCompetitor = db.prepare(
      'INSERT INTO competitors (name, type) VALUES (?, ?)'
    );
    const result = insertCompetitor.run(name, type);
    const competitorId = result.lastInsertRowid;

    // Insert URLs
    const insertUrl = db.prepare(
      'INSERT INTO competitor_urls (competitor_id, url, source_type) VALUES (?, ?, ?)'
    );

    for (const url of urls) {
      if (url && url.trim()) {
        const sourceType = detectSourceType(url.trim());
        insertUrl.run(competitorId, url.trim(), sourceType);
      }
    }

    return NextResponse.json({ id: competitorId, name, type });
  } catch (error) {
    console.error('Failed to create competitor:', error);
    return NextResponse.json({ error: 'Failed to create competitor' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing competitor ID' }, { status: 400 });
    }

    // Delete URLs first (foreign key)
    db.prepare('DELETE FROM competitor_urls WHERE competitor_id = ?').run(id);
    db.prepare('DELETE FROM competitors WHERE id = ?').run(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete competitor:', error);
    return NextResponse.json({ error: 'Failed to delete competitor' }, { status: 500 });
  }
}
