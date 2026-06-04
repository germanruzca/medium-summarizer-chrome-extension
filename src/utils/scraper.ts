interface Proxy {
  name: string;
  buildUrl: (url: string) => string;
  selector: string;
}

const PROXIES: Proxy[] = [
  {
    name: 'Archive',
    buildUrl: (url: string) => `https://archive.ph/newest/${url}`,
    selector: 'article, #CONTENT',
  },
];

export interface FetchResult {
  text: string;
  proxyName: string;
  fetchedAt: number;
}

export async function fetchArticle(mediumUrl: string): Promise<FetchResult> {
  let lastError: Error = new Error('No proxies attempted');

  for (const proxy of PROXIES) {
    try {
      const proxiedUrl = proxy.buildUrl(mediumUrl);
      const res = await fetch(proxiedUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0' },
      });

      if (!res.ok) {
        lastError = new Error(`HTTP ${res.status} from ${proxy.name}`);
        continue;
      }

      const html = await res.text();
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      doc
        .querySelectorAll(
          'script, style, nav, header, footer, .ad, iframe, .banner, [class*="paywall"]'
        )
        .forEach((el) => el.remove());

      const articleEl = doc.querySelector(proxy.selector);
      const text = (articleEl as HTMLElement | null)?.innerText?.trim();

      if (text && text.length > 500) {
        return {
          text,
          proxyName: proxy.name,
          fetchedAt: Date.now(),
        };
      }

      lastError = new Error(`Content too short from ${proxy.name}`);
    } catch (err) {
      lastError = err as Error;
      continue;
    }
  }

  throw new Error(`All proxies failed: ${lastError.message}`);
}

// Hard cap: 99% of Medium articles are under 2500 words.
// Capping here eliminates multi-chunk API calls (which cost 3× more).
const MAX_ARTICLE_WORDS = 2500;

export function cleanArticleText(raw: string): string {
  const stripped = raw
    // Remove any HTML tags that slipped through
    .replace(/<[^>]*>/g, ' ')
    // Decode common HTML entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-zA-Z0-9#]+;/g, ' ')
    // Collapse runs of spaces left by removed tags
    .replace(/ {2,}/g, ' ');

  const cleaned = stripped
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => {
      if (!l) return false;
      // Must contain letters — drops pure-number lines like "1.2K", timestamps, etc.
      if (!/[a-zA-Z]/.test(l)) return false;
      // Drop short UI fragments: ≤3 words AND under 20 chars (e.g. "Follow", "Sign in", "Save")
      const words = l.split(/\s+/).length;
      if (words <= 3 && l.length < 20) return false;
      return true;
    })
    .join('\n')
    // Collapse 3+ blank lines to one
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const words = cleaned.split(/\s+/);
  if (words.length > MAX_ARTICLE_WORDS) {
    return words.slice(0, MAX_ARTICLE_WORDS).join(' ');
  }
  return cleaned;
}

// Kept for backward compatibility but no longer used in the main flow
export function chunkText(text: string, maxWords = 4000): string[] {
  const words = text.split(' ');
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += maxWords) {
    chunks.push(words.slice(i, i + maxWords).join(' '));
  }
  return chunks;
}

export function isMediumUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === 'medium.com' ||
      parsed.hostname.endsWith('.medium.com')
    );
  } catch {
    return false;
  }
}

export function extractTitleFromUrl(url: string): string {
  try {
    const parsed = new URL(url);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const slug = segments[segments.length - 1] ?? '';
    // Strip trailing hash id like "-a1b2c3d4e5f6"
    const cleaned = slug.replace(/-[a-f0-9]{10,}$/, '');
    return cleaned
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  } catch {
    return 'Medium Article';
  }
}
