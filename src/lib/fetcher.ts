import * as cheerio from 'cheerio';

export interface FetchResult {
  hasNewContent: boolean;
  contentUrl: string | null;
  contentText: string | null;
  error: string | null;
}

export async function fetchUrl(url: string, lastKnownUrl: string | null): Promise<FetchResult> {
  try {
    // Check if URL looks like a direct RSS/XML feed
    const isLikelyFeed = url.includes('rss.app') ||
                         url.includes('/feed') ||
                         url.includes('/rss') ||
                         url.endsWith('.xml') ||
                         url.endsWith('.rss') ||
                         url.includes('feeds.') ||
                         url.includes('/atom');

    if (isLikelyFeed) {
      const feedResult = await tryFetchFeed(url, url, lastKnownUrl);
      if (feedResult) {
        return feedResult;
      }
    }

    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CompetitorWatch/1.0; Demo)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return {
        hasNewContent: false,
        contentUrl: null,
        contentText: null,
        error: `HTTP ${response.status}`,
      };
    }

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    // If response is XML/RSS, parse as feed
    if (contentType.includes('xml') || contentType.includes('rss') || text.trimStart().startsWith('<?xml')) {
      const $ = cheerio.load(text, { xmlMode: true });

      // RSS format
      let item = $('item').first();
      let link = item.find('link').text() || item.find('link').attr('href');
      let title = item.find('title').text();
      let description = item.find('description').text();

      // Atom format
      if (!link) {
        item = $('entry').first();
        link = item.find('link').attr('href') || item.find('link').text();
        title = item.find('title').text();
        description = item.find('summary, content').text();
      }

      if (link) {
        const contentText = `${title}. ${description}`.slice(0, 500);
        return {
          hasNewContent: link !== lastKnownUrl,
          contentUrl: link,
          contentText,
          error: null,
        };
      }
    }

    const $ = cheerio.load(text);

    // Remove scripts and styles
    $('script, style, nav, footer, header').remove();

    // Try to find the main content
    let contentUrl: string | null = null;
    let contentText: string | null = null;

    // Check for RSS/Atom feed link in HTML
    const rssLink = $('link[type="application/rss+xml"], link[type="application/atom+xml"]').first().attr('href');
    if (rssLink) {
      const feedResult = await tryFetchFeed(rssLink, url, lastKnownUrl);
      if (feedResult) {
        return feedResult;
      }
    }

    // Facebook-specific parsing
    if (url.includes('facebook.com')) {
      // Facebook requires login to see posts - we can only get public page metadata
      // This is a known limitation: actual post detection is not possible without FB API
      const pageTitle = $('title').text();
      const ogDesc = $('meta[property="og:description"]').attr('content');

      contentText = ogDesc || pageTitle || null;
      contentUrl = url;

      // We cannot reliably detect new posts on Facebook without their API
      // Return with a clear limitation message
      return {
        hasNewContent: false,
        contentUrl,
        contentText: contentText?.slice(0, 500) || null,
        error: 'Facebook requires login to view posts. Only page description available.',
      };
    }

    // LinkedIn-specific parsing
    if (url.includes('linkedin.com')) {
      // LinkedIn also requires login for most content
      const ogDesc = $('meta[property="og:description"]').attr('content');
      const pageTitle = $('title').text();

      contentText = ogDesc || pageTitle || null;
      contentUrl = url;

      return {
        hasNewContent: false,
        contentUrl,
        contentText: contentText?.slice(0, 500) || null,
        error: 'LinkedIn requires login to view posts. Only page description available.',
      };
    }

    // General website parsing - look for article/blog content
    // Expand selectors to cover more blog structures
    const article = $('article').first();
    const main = $('main').first();
    const blogPost = $(
      '.post, .blog-post, .entry, [class*="article"], ' +
      '[class*="blog"], [class*="post"], [class*="news"], ' +
      '.card, .item, [class*="card"], [class*="item"], ' +
      'section[class*="blog"], section[class*="post"], ' +
      '.content, #content, [role="main"]'
    ).first();

    const contentContainer = article.length ? article :
                            blogPost.length ? blogPost :
                            main.length ? main :
                            $('body');

    // Try to find the latest post/article link with improved detection
    // Look for links that look like blog posts (contain dates, slugs, or blog paths)
    const allLinks = contentContainer.find('a[href]').toArray();
    const blogLinkPatterns = [
      /\/blog\//i, /\/post\//i, /\/article\//i, /\/news\//i,
      /\/\d{4}\/\d{2}\//, // date patterns like /2024/01/
      /\-\d+$/, // ends with ID like -123
      /\/[a-z0-9\-]+\-[a-z0-9\-]+$/, // slug patterns
    ];

    // First pass: look for links that look like blog post URLs
    for (const link of allLinks.slice(0, 30)) {
      const href = $(link).attr('href');
      const text = $(link).text().trim();
      if (!href || href.includes('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;

      const fullUrl = href.startsWith('http') ? href : new URL(href, url).toString();

      // Skip if same as base URL or last known
      if (fullUrl === url || fullUrl === lastKnownUrl) continue;

      // Check if URL looks like a blog post
      const looksLikeBlogPost = blogLinkPatterns.some(pattern => pattern.test(fullUrl));

      if (looksLikeBlogPost && text.length > 5) {
        contentUrl = fullUrl;
        contentText = text;
        break;
      }
    }

    // Second pass: if no blog-like link found, try any meaningful link
    if (!contentUrl) {
      for (const link of allLinks.slice(0, 20)) {
        const href = $(link).attr('href');
        const text = $(link).text().trim();
        if (!href || href.includes('#') || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
        if (text.length < 10) continue;

        const fullUrl = href.startsWith('http') ? href : new URL(href, url).toString();
        if (fullUrl !== url && fullUrl !== lastKnownUrl) {
          contentUrl = fullUrl;
          contentText = text;
          break;
        }
      }
    }

    // If we found a link but no text, get surrounding context
    if (contentUrl && (!contentText || contentText.length < 20)) {
      const textContent = contentContainer.text()
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 1000);
      contentText = textContent || null;
    }

    // Determine if there's new content
    const hasNewContent = Boolean(contentUrl && contentUrl !== lastKnownUrl);

    return {
      hasNewContent,
      contentUrl: contentUrl || url,
      contentText,
      error: !contentUrl ? 'Could not find blog posts on this page.' : null,
    };

  } catch (error) {
    return {
      hasNewContent: false,
      contentUrl: null,
      contentText: null,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

async function tryFetchFeed(feedUrl: string, baseUrl: string, lastKnownUrl: string | null): Promise<FetchResult | null> {
  try {
    const fullFeedUrl = feedUrl.startsWith('http') ? feedUrl : new URL(feedUrl, baseUrl).toString();

    const response = await fetch(fullFeedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; CompetitorWatch/1.0; Demo)',
        'Accept': 'application/rss+xml, application/atom+xml, application/xml, text/xml',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) return null;

    const xml = await response.text();
    const $ = cheerio.load(xml, { xmlMode: true });

    // RSS format
    let item = $('item').first();
    let link = item.find('link').text() || item.find('link').attr('href');
    let title = item.find('title').text();
    let description = item.find('description').text();

    // Atom format
    if (!link) {
      item = $('entry').first();
      link = item.find('link').attr('href') || item.find('link').text();
      title = item.find('title').text();
      description = item.find('summary, content').text();
    }

    if (link) {
      const contentText = `${title}. ${description}`.slice(0, 500);
      return {
        hasNewContent: link !== lastKnownUrl,
        contentUrl: link,
        contentText,
        error: null,
      };
    }

    return null;
  } catch {
    return null;
  }
}

export function summarizeContent(text: string | null): string {
  if (!text || text.length < 20) {
    return 'Update detected, but content could not be summarized.';
  }

  // Simple extractive summarization - get first meaningful sentences
  const sentences = text
    .replace(/\s+/g, ' ')
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 200);

  if (sentences.length === 0) {
    return 'Update detected, but content could not be summarized.';
  }

  // Take first 1-2 sentences
  const summary = sentences.slice(0, 2).join('. ');
  return summary.length > 200 ? summary.slice(0, 197) + '...' : summary + '.';
}
