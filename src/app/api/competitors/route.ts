import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import {
  getCompetitorsWithUrls,
  createCompetitor,
  createCompetitorUrl,
  deleteCompetitor,
  updateCompetitor,
  deleteCompetitorUrl,
  updateUrlDetails,
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

    // Insert URLs - urls can be strings or objects with {url, name}
    for (const urlItem of urls) {
      if (typeof urlItem === 'string') {
        if (urlItem.trim()) {
          const sourceType = detectSourceType(urlItem.trim());
          await createCompetitorUrl(competitorId, urlItem.trim(), sourceType);
        }
      } else if (urlItem && urlItem.url && urlItem.url.trim()) {
        const sourceType = detectSourceType(urlItem.url.trim());
        await createCompetitorUrl(competitorId, urlItem.url.trim(), sourceType, urlItem.name || null);
      }
    }

    return NextResponse.json({ id: competitorId, name, type });
  } catch (error) {
    console.error('Failed to create competitor:', error);
    return NextResponse.json({ error: 'Failed to create competitor' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, type, urls } = body;

    if (!id) {
      return NextResponse.json({ error: 'Missing competitor ID' }, { status: 400 });
    }

    // Update competitor name/type if provided
    if (name && type) {
      const updated = await updateCompetitor(id, session.userId, name, type);
      if (!updated) {
        return NextResponse.json({ error: 'Competitor not found' }, { status: 404 });
      }
    }

    // Handle URL updates if provided
    if (urls && Array.isArray(urls)) {
      for (const urlItem of urls) {
        if (urlItem.action === 'delete' && urlItem.id) {
          // Delete URL
          await deleteCompetitorUrl(urlItem.id, session.userId);
        } else if (urlItem.action === 'update' && urlItem.id) {
          // Update existing URL
          const sourceType = detectSourceType(urlItem.url.trim());
          await updateUrlDetails(urlItem.id, session.userId, urlItem.url.trim(), urlItem.name || null, sourceType);
        } else if (urlItem.action === 'add' && urlItem.url) {
          // Add new URL
          const sourceType = detectSourceType(urlItem.url.trim());
          await createCompetitorUrl(id, urlItem.url.trim(), sourceType, urlItem.name || null);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to update competitor:', error);
    return NextResponse.json({ error: 'Failed to update competitor' }, { status: 500 });
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
    const urlId = searchParams.get('urlId');

    // Delete single URL
    if (urlId) {
      const deleted = await deleteCompetitorUrl(parseInt(urlId, 10), session.userId);
      if (!deleted) {
        return NextResponse.json({ error: 'URL not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true });
    }

    // Delete competitor
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
