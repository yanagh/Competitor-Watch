import { NextRequest, NextResponse } from 'next/server';
import db, { CompetitorUrl } from '@/lib/db';
import { fetchUrl, summarizeContent } from '@/lib/fetcher';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const urlId = body.urlId;

    let urls: CompetitorUrl[];

    if (urlId) {
      // Refresh single URL
      urls = db.prepare('SELECT * FROM competitor_urls WHERE id = ?').all(urlId) as CompetitorUrl[];
    } else {
      // Refresh all URLs
      urls = db.prepare('SELECT * FROM competitor_urls').all() as CompetitorUrl[];
    }

    const updateStmt = db.prepare(`
      UPDATE competitor_urls
      SET last_checked = ?,
          last_update_url = CASE WHEN ? IS NOT NULL THEN ? ELSE last_update_url END,
          last_update_date = CASE WHEN ? = 1 THEN ? ELSE last_update_date END,
          last_summary = CASE WHEN ? = 1 THEN ? ELSE last_summary END,
          status = ?
      WHERE id = ?
    `);

    const results = [];

    for (const urlRecord of urls) {
      const now = new Date().toISOString();
      const result = await fetchUrl(urlRecord.url, urlRecord.last_update_url);

      let status: string;
      let summary: string | null = null;

      if (result.error) {
        status = 'error';
        summary = result.error;
      } else if (result.hasNewContent) {
        status = 'new_update';
        summary = summarizeContent(result.contentText);
      } else {
        status = 'no_updates';
        // Keep existing summary if no new content
        summary = urlRecord.last_summary;
      }

      const hasNew = result.hasNewContent ? 1 : 0;

      updateStmt.run(
        now,
        result.contentUrl,
        result.contentUrl,
        hasNew,
        now,
        hasNew,
        summary,
        status,
        urlRecord.id
      );

      results.push({
        id: urlRecord.id,
        url: urlRecord.url,
        status,
        hasNewContent: result.hasNewContent,
        error: result.error,
      });
    }

    return NextResponse.json({ success: true, results });
  } catch (error) {
    console.error('Failed to refresh:', error);
    return NextResponse.json({ error: 'Failed to refresh' }, { status: 500 });
  }
}
