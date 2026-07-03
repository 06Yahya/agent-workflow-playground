export interface ScrapeResult {
  requestedUrl: string;
  finalUrl: string;
  title: string;
  description: string | null;
  content: string;
  links: string[];
  contacts: {
    phones: string[];
    emails: string[];
  };
  error?: string;
  status?: number;
}

const MAX_CONTACT_TEXT = 12000;

export function normalizeUrl(input: string): string {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('URL is required');
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : 'https://' + trimmed;
  const url = new URL(withProtocol);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('Only http and https URLs are supported');
  return url.toString();
}

export async function scrapePage(inputUrl: string): Promise<ScrapeResult> {
  const requestedUrl = normalizeUrl(inputUrl);
  const base: ScrapeResult = {
    requestedUrl,
    finalUrl: requestedUrl,
    title: '',
    description: null,
    content: '',
    links: [],
    contacts: { phones: [], emails: [] },
  };

  try {
    const response = await fetch(requestedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; AgentWorkflowPlayground/2.0; +https://github.com/06Yahya/agent-workflow-playground)',
        Accept: 'text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5',
      },
      redirect: 'follow',
    });

    base.finalUrl = response.url || requestedUrl;
    base.status = response.status;

    if (!response.ok) {
      return { ...base, error: 'HTTP ' + response.status + ': ' + response.statusText };
    }

    const html = await response.text();
    const content = cleanHtml(html);
    return {
      ...base,
      title: extractTitle(html),
      description: extractMetaDescription(html),
      content,
      links: extractLinks(html, base.finalUrl).slice(0, 30),
      contacts: extractContacts(html, content),
    };
  } catch (error) {
    return { ...base, error: error instanceof Error ? error.message : 'Unknown fetch error' };
  }
}

export function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? decodeEntities(match[1]).replace(/\s+/g, ' ').trim() : '';
}

export function extractMetaDescription(html: string): string | null {
  const match = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["'][^>]*>/i)
    || html.match(/<meta[^>]+content=["']([^"']*)["'][^>]+name=["']description["'][^>]*>/i);
  return match ? decodeEntities(match[1]).replace(/\s+/g, ' ').trim() : null;
}

export function cleanHtml(html: string): string {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<svg[^>]*>[\s\S]*?<\/svg>/gi, '')
    .replace(/<noscript[^>]*>[\s\S]*?<\/noscript>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' | ')
    .replace(/<[^>]+>/g, ' ');

  text = decodeEntities(text)
    .replace(/[ \t]+/g, ' ')
    .replace(/\n[ \t]+/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (text.length > 9000) text = text.slice(0, 9000) + '\n\n[content truncated for model context]';
  return text;
}

export function extractLinks(html: string, baseUrl: string): string[] {
  const links = new Set<string>();
  for (const match of html.matchAll(/<a[^>]+href=["']([^"'#]+)["'][^>]*>/gi)) {
    const href = match[1];
    if (!href || href.startsWith('mailto:') || href.startsWith('tel:')) continue;
    try {
      const url = new URL(href, baseUrl);
      if (url.protocol === 'http:' || url.protocol === 'https:') links.add(url.toString());
    } catch {
      continue;
    }
  }
  return Array.from(links);
}

export function extractContacts(html: string, cleanedText = ''): { phones: string[]; emails: string[] } {
  const emailMatches = new Set<string>();
  const phoneMatches = new Set<string>();

  for (const match of html.matchAll(/href=["']mailto:([^"'#?]+)[^"']*["']/gi)) {
    const email = decodeURIComponentSafe(match[1]).trim().toLowerCase();
    if (email) emailMatches.add(email);
  }

  for (const match of html.matchAll(/href=["']tel:([^"'#?]+)[^"']*["']/gi)) {
    const phone = normalizePhone(decodeURIComponentSafe(match[1]));
    if (phone) phoneMatches.add(phone);
  }

  const text = cleanedText.slice(0, MAX_CONTACT_TEXT);
  for (const email of text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []) {
    emailMatches.add(email.toLowerCase());
  }

  for (const phone of text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || []) {
    const normalized = normalizePhone(phone);
    if (normalized) phoneMatches.add(normalized);
  }

  return { phones: Array.from(phoneMatches).slice(0, 8), emails: Array.from(emailMatches).slice(0, 8) };
}

function normalizePhone(value: string): string {
  return value.replace(/%20/g, ' ').replace(/\s+/g, ' ').trim();
}

function decodeURIComponentSafe(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function decodeEntities(input: string): string {
  return input
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&[a-z0-9#]+;/gi, ' ');
}
