import { runInference } from '../lib/ai';
import { prospectResearchUser, PROSPECT_RESEARCH_SYSTEM } from '../lib/prompts';
import { scrapePage } from '../lib/scraper';
import { measure, WorkflowTrace } from '../lib/trace';
import type { WorkflowEnvelope } from '../types';

export interface ProspectResearchInput {
  url: string;
}

export interface ProspectResearchOutput {
  url: string;
  title: string;
  report: string;
  evidence: {
    finalUrl: string;
    pageLength: number;
    linksSample: string[];
    contactsFound: { emails: string[]; phones: string[] };
  };
}

export async function runProspectResearch(ai: Ai, input: ProspectResearchInput): Promise<WorkflowEnvelope<ProspectResearchOutput>> {
  const trace = new WorkflowTrace();
  const started = Date.now();

  const { result: scrape, durationMs: scrapeMs } = await measure(() => scrapePage(input.url));
  trace.step('scrape', 'Scrape target page', scrape.error ? 'Scraper returned limited content: ' + scrape.error : 'Fetched and cleaned ' + scrape.content.length + ' characters.', scrape.error ? 'warning' : 'complete', scrapeMs);

  if (scrape.error || scrape.content.length < 80) {
    return {
      success: false,
      workflow: 'prospect-research',
      input: { url: input.url },
      trace: trace.steps,
      warnings: trace.warnings,
      error: scrape.error || 'Scraped content too limited for analysis.',
      metadata: { generatedAt: new Date().toISOString(), durationMs: Date.now() - started, scrapeStatus: scrape.status },
    };
  }

  try {
    const { result: aiResult, durationMs: aiMs } = await measure(() =>
      runInference(ai, PROSPECT_RESEARCH_SYSTEM, prospectResearchUser(scrape.finalUrl, scrape.title, scrape.description, scrape.content), { maxTokens: 1800, temperature: 0.2 }),
    );
    trace.step('reason', 'Analyse conversion evidence', 'Generated audit with ' + aiResult.model + '.', 'complete', aiMs);
    trace.step('package', 'Package audit', 'Returned markdown report, evidence summary, trace, and metadata.');

    return {
      success: true,
      workflow: 'prospect-research',
      input: { url: input.url },
      output: {
        url: scrape.requestedUrl,
        title: scrape.title,
        report: aiResult.text,
        evidence: {
          finalUrl: scrape.finalUrl,
          pageLength: scrape.content.length,
          linksSample: scrape.links.slice(0, 8),
          contactsFound: scrape.contacts,
        },
      },
      trace: trace.steps,
      warnings: trace.warnings,
      metadata: { generatedAt: new Date().toISOString(), durationMs: Date.now() - started, model: aiResult.model, scrapeStatus: scrape.status },
    };
  } catch (error) {
    trace.fail('reason', 'Analyse conversion evidence', error instanceof Error ? error.message : 'AI inference failed');
    return {
      success: false,
      workflow: 'prospect-research',
      input: { url: input.url },
      trace: trace.steps,
      warnings: trace.warnings,
      error: error instanceof Error ? error.message : 'AI inference failed',
      metadata: { generatedAt: new Date().toISOString(), durationMs: Date.now() - started, scrapeStatus: scrape.status },
    };
  }
}
