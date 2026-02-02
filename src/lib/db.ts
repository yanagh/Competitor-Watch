import { PrismaClient } from '@/generated/prisma/client';

// Prevent multiple instances in development
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({
  // Prisma Postgres uses Accelerate
  accelerateUrl: process.env.PRISMA_DATABASE_URL || process.env.DATABASE_URL!,
});

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

// Types for API responses
export interface DashboardItem {
  competitor_id: number;
  competitor_name: string;
  competitor_type: string;
  url_id: number;
  url: string;
  url_name: string | null;
  source_type: string;
  last_checked: string | null;
  last_update_url: string | null;
  last_update_date: string | null;
  last_summary: string | null;
  status: string;
}

// User operations
export async function createUser(email: string, passwordHash: string) {
  try {
    return await prisma.user.create({
      data: { email, passwordHash },
    });
  } catch {
    return null;
  }
}

export async function getUserByEmail(email: string) {
  return prisma.user.findUnique({
    where: { email },
  });
}

export async function getUserById(id: number) {
  return prisma.user.findUnique({
    where: { id },
  });
}

// Competitor operations
export async function getCompetitorsWithUrls(userId: number): Promise<DashboardItem[]> {
  const competitors = await prisma.competitor.findMany({
    where: { userId },
    include: { urls: true },
    orderBy: { name: 'asc' },
  });

  const items: DashboardItem[] = [];

  for (const competitor of competitors) {
    if (competitor.urls.length === 0) {
      // Include competitor even without URLs
      items.push({
        competitor_id: competitor.id,
        competitor_name: competitor.name,
        competitor_type: competitor.type,
        url_id: 0,
        url: '',
        url_name: null,
        source_type: '',
        last_checked: null,
        last_update_url: null,
        last_update_date: null,
        last_summary: null,
        status: '',
      });
    } else {
      for (const url of competitor.urls) {
        items.push({
          competitor_id: competitor.id,
          competitor_name: competitor.name,
          competitor_type: competitor.type,
          url_id: url.id,
          url: url.url,
          url_name: url.name,
          source_type: url.sourceType,
          last_checked: url.lastChecked?.toISOString() || null,
          last_update_url: url.lastUpdateUrl,
          last_update_date: url.lastUpdateDate?.toISOString() || null,
          last_summary: url.lastSummary,
          status: url.status,
        });
      }
    }
  }

  return items;
}

export async function createCompetitor(
  userId: number,
  name: string,
  type: 'competitor' | 'partner' | 'inspiration'
) {
  const competitor = await prisma.competitor.create({
    data: { userId, name, type },
  });
  return competitor.id;
}

export async function deleteCompetitor(competitorId: number, userId: number) {
  const result = await prisma.competitor.deleteMany({
    where: { id: competitorId, userId },
  });
  return result.count > 0;
}

// URL operations
export async function createCompetitorUrl(
  competitorId: number,
  url: string,
  sourceType: 'facebook' | 'website' | 'linkedin',
  name?: string | null
) {
  const competitorUrl = await prisma.competitorUrl.create({
    data: { competitorId, url, sourceType, name: name || null },
  });
  return competitorUrl.id;
}

export async function getCompetitorUrls(userId: number, urlId?: number) {
  if (urlId) {
    return prisma.competitorUrl.findMany({
      where: {
        id: urlId,
        competitor: { userId },
      },
    });
  }
  return prisma.competitorUrl.findMany({
    where: {
      competitor: { userId },
    },
  });
}

export async function updateCompetitorUrl(
  urlId: number,
  lastChecked: string,
  contentUrl: string | null,
  hasNew: boolean,
  summary: string | null,
  status: 'pending' | 'new_update' | 'no_updates' | 'error',
  contentDate?: string | null
) {
  const data: {
    lastChecked: Date;
    lastUpdateUrl?: string;
    lastUpdateDate?: Date;
    lastSummary?: string | null;
    status: 'pending' | 'new_update' | 'no_updates' | 'error';
  } = {
    lastChecked: new Date(lastChecked),
    status,
  };

  if (contentUrl) {
    data.lastUpdateUrl = contentUrl;
  }

  if (hasNew) {
    // Use the content's original publication date if available, otherwise use check time
    data.lastUpdateDate = contentDate ? new Date(contentDate) : new Date(lastChecked);
    data.lastSummary = summary;
  }

  await prisma.competitorUrl.update({
    where: { id: urlId },
    data,
  });
}

// Update competitor details
export async function updateCompetitor(
  competitorId: number,
  userId: number,
  name: string,
  type: 'competitor' | 'partner' | 'inspiration'
) {
  const result = await prisma.competitor.updateMany({
    where: { id: competitorId, userId },
    data: { name, type },
  });
  return result.count > 0;
}

// Delete a URL
export async function deleteCompetitorUrl(urlId: number, userId: number) {
  const result = await prisma.competitorUrl.deleteMany({
    where: {
      id: urlId,
      competitor: { userId },
    },
  });
  return result.count > 0;
}

// Update a URL
export async function updateUrlDetails(
  urlId: number,
  userId: number,
  url: string,
  name: string | null,
  sourceType: 'facebook' | 'website' | 'linkedin'
) {
  const result = await prisma.competitorUrl.updateMany({
    where: {
      id: urlId,
      competitor: { userId },
    },
    data: { url, name, sourceType },
  });
  return result.count > 0;
}
