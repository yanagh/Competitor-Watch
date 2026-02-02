import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getCompetitorsWithUrls,
  createCompetitor,
  createCompetitorUrl,
  deleteCompetitor,
} from '@/lib/db';

function detectSourceType(url: string): 'facebook' | 'website' | 'linkedin' {
  if (url.includes('facebook.com') || url.includes('fb.com')) return 'facebook';
  if (url.includes('linkedin.com')) return 'linkedin';
  return 'website';
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const competitors = await getCompetitorsWithUrls(session.userId);
    return NextResponse.json(competitors);
  } catch (error) {
    console.error('Failed to fetch competitors:', error);
    return NextResponse.json({ error: 'Failed to fetch competitors' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, urls } = body;

    if (!name || !type || !urls || !Array.isArray(urls)) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (!['competitor', 'partner', 'inspiration'].includes(type)) {
      return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
    }

    // Insert competitor
    const competitorId = await createCompetitor(session.userId, name, type);
    if (!competitorId) {
      return NextResponse.json({ error: 'Failed to create competitor' }, { status: 500 });
    }

    // Insert URLs
    for (const url of urls) {
      if (url && url.trim()) {
        const sourceType = detectSourceType(url.trim());
        await createCompetitorUrl(competitorId, url.trim(), sourceType);
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
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Missing competitor ID' }, { status: 400 });
    }

    const deleted = await deleteCompetitor(parseInt(id, 10), session.userId);
    if (!deleted) {
      return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete competitor:', error);
    return NextResponse.json({ error: 'Failed to delete competitor' }, { status: 500 });
  }
}
