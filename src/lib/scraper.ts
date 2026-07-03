/**
 * Simple URL scraper for Workers.
 * Fetches a URL and returns cleaned text content.
 * Limitations: some sites block Workers IP ranges; single-page only.
 */

export interface ScrapeResult {
  url: string;
  title: string;
  content: string;
  error?: string;
}

export async function scrapePage(url: string): Promise<ScrapeResult> {
  const result: ScrapeResult = { url, title: '', content: '' };

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent':
          'Mozilla/5.0 (compatible; AgentWorkflowBot/1.0; +https://github.com/yahyashihabe/agent-workflow-playground)',
        Accept: 'text/html,application/xhtml+xml',
      },
      redirect: 'follow',
    });

    if (!response.ok) {
      result.error = `HTTP ${response.status}: ${response.statusText}`;
      return result;
    }

    const html = await response.text();
    result.title = extractTitle(html);
    result.content = cleanHtml(html);
  } catch (err) {
    result.error = err instanceof Error ? err.message : 'Unknown fetch error';
  }

  return result;
}

function extractTitle(html: string): string {
  const match = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  return match ? match[1].trim() : '';
}

/**
 * Strips HTML tags and returns readable text.
 * Preserves headings, paragraphs, and list structure.
 */
function cleanHtml(html: string): string {
  let text = html
    // Remove script and style blocks
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
    .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
    // Replace block elements with newlines
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/td>/gi, ' | ')
    // Strip remaining tags
    .replace(/<[^>]+>/g, '')
    // Decode common entities
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#x2F;/g, '/')
    .replace(/&nbsp;/g, ' ')
    // Clean up whitespace
    .replace(/&[^;]+;/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // Truncate to avoid token limits (roughly 8000 chars ≈ 2000 tokens)
  if (text.length > 8000) {
    text = text.slice(0, 8000) + '\n\n[... content truncated ...]';
  }

  return text;
}
