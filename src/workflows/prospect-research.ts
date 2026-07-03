/**
 * Prospect Research Agent
 *
 * Workflow:
 * 1. Scrape the company website
 * 2. Analyse content with Workers AI (Llama 3)
 * 3. Return structured audit report
 *
 * Tools used: scrape_page, analyze_content (LLM)
 */

import { runInference } from '../lib/ai';
import { scrapePage } from '../lib/scraper';
import { PROSPECT_RESEARCH_SYSTEM, PROSPECT_RESEARCH_USER } from '../lib/prompts';

export interface ProspectResearchInput {
  url: string;
}

export interface ProspectResearchOutput {
  success: boolean;
  url: string;
  report?: string;
  error?: string;
  metadata: {
    pageTitle: string;
    pageLength: number;
    scrapeSuccess: boolean;
  };
}

export async function runProspectResearch(
  ai: Ai,
  input: ProspectResearchInput
): Promise<ProspectResearchOutput> {
  // Validate URL
  let targetUrl = input.url.trim();
  if (!targetUrl.startsWith('http://') && !targetUrl.startsWith('https://')) {
    targetUrl = 'https://' + targetUrl;
  }

  // Step 1: Scrape the site (tool call)
  const scrapeResult = await scrapePage(targetUrl);

  const output: ProspectResearchOutput = {
    success: false,
    url: targetUrl,
    metadata: {
      pageTitle: scrapeResult.title,
      pageLength: scrapeResult.content.length,
      scrapeSuccess: !scrapeResult.error,
    },
  };

  if (scrapeResult.error) {
    output.error = `Failed to scrape site: ${scrapeResult.error}`;
    return output;
  }

  if (!scrapeResult.content || scrapeResult.content.length < 50) {
    output.error = 'Scraped content too limited for analysis. The site may require JavaScript or block Workers.';
    return output;
  }

  // Step 2: Analyse with LLM (tool call)
  const report = await runInference(
    ai,
    PROSPECT_RESEARCH_SYSTEM,
    PROSPECT_RESEARCH_USER(targetUrl, scrapeResult.content),
    { temperature: 0.3, maxTokens: 2048 }
  );

  output.success = true;
  output.report = report;

  return output;
}
