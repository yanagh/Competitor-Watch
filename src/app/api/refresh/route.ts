import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompetitorUrls, updateCompetitorUrl } from '@/lib/db';
import { fetchUrl, summarizeContent } from '@/lib/fetcher';

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const urlId = body.urlId;

    // Get URLs belonging to user's competitors
    const urls = await getCompetitorUrls(session.userId, urlId);

    const results = [];

    for (const urlRecord of urls) {
      const now = new Date().toISOString();
      const result = await fetchUrl(urlRecord.url, urlRecord.lastUpdateUrl);

      let status: 'pending' | 'new_update' | 'no_updates' | 'error';
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
        summary = urlRecord.lastSummary;
      }

      await updateCompetitorUrl(
        urlRecord.id,
        now,
        result.contentUrl,
        result.hasNewContent,
        summary,
        status,
        result.contentDate
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
