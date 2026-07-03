import { runInferenceStructured } from '../lib/ai';
import { crmEnrichmentUser, CRM_ENRICHMENT_SYSTEM } from '../lib/prompts';
import { normalizeUrl, scrapePage } from '../lib/scraper';
import { measure, WorkflowTrace } from '../lib/trace';
import type { WorkflowEnvelope } from '../types';

export interface CrmEnrichmentInput {
  company: string;
  url?: string;
}

export interface CrmEnrichmentOutput {
  companyName: string | null;
  industry: string | null;
  businessType: string | null;
  location: string | null;
  summary: string;
  crmTags: string[];
  leadScore: number;
  recommendedSegment: string;
  suggestedNextAction: string;
  contact: { emails: string[]; phones: string[] };
  confidence: 'high' | 'medium' | 'low';
}

export async function runCrmEnrichment(ai: Ai, input: CrmEnrichmentInput): Promise<WorkflowEnvelope<CrmEnrichmentOutput>> {
  const trace = new WorkflowTrace();
  const started = Date.now();
  const company = input.company.trim();
  if (!company) {
    return failure(input, trace, started, 'Missing required field: company');
  }

  let content = '';
  let contacts = { emails: [] as string[], phones: [] as string[] };
  let finalUrl: string | undefined;
  let title = company;

  if (input.url) {
    const normalized = normalizeUrl(input.url);
    const { result: scrape, durationMs } = await measure(() => scrapePage(normalized));
    finalUrl = scrape.finalUrl;
    title = scrape.title || company;
    content = scrape.content;
    contacts = scrape.contacts;
    trace.step('scrape', 'Inspect public website', scrape.error ? 'Website fetch was limited: ' + scrape.error : 'Fetched website evidence for enrichment.', scrape.error ? 'warning' : 'complete', durationMs);
  } else {
    trace.warn('scrape', 'Inspect public website', 'No URL supplied, enrichment is based on the company name only.');
  }

  try {
    const { result, durationMs } = await measure(() =>
      runInferenceStructured<CrmEnrichmentOutput>(ai, CRM_ENRICHMENT_SYSTEM, crmEnrichmentUser(company, finalUrl, content, contacts), { maxTokens: 1100, temperature: 0.1 }),
    );
    if (!result.data) {
      trace.warn('parse', 'Parse structured output', 'Model returned non-JSON. Falling back to deterministic enrichment.', durationMs);
      return success(input, trace, started, heuristicCrm(company, title, content, contacts), result.model, finalUrl);
    }
    trace.step('classify', 'Classify CRM fields', 'Returned structured CRM JSON with ' + result.model + '.', 'complete', durationMs);
    trace.step('verify', 'Apply confidence boundary', result.data.confidence === 'low' ? 'Low confidence because public evidence was thin.' : 'Fields grounded in supplied evidence.', result.data.confidence === 'low' ? 'warning' : 'complete');
    return success(input, trace, started, result.data, result.model, finalUrl);
  } catch (error) {
    trace.warn('classify', 'Classify CRM fields', error instanceof Error ? error.message : 'AI inference failed');
    return success(input, trace, started, heuristicCrm(company, title, content, contacts), undefined, finalUrl);
  }
}

function success(input: CrmEnrichmentInput, trace: WorkflowTrace, started: number, output: CrmEnrichmentOutput, model?: string, finalUrl?: string): WorkflowEnvelope<CrmEnrichmentOutput> {
  return {
    success: true,
    workflow: 'crm-enrichment',
    input: { company: input.company, url: input.url },
    output,
    trace: trace.steps,
    warnings: trace.warnings,
    metadata: { generatedAt: new Date().toISOString(), durationMs: Date.now() - started, model, finalUrl },
  };
}

function failure(input: CrmEnrichmentInput, trace: WorkflowTrace, started: number, error: string): WorkflowEnvelope<CrmEnrichmentOutput> {
  trace.fail('validate', 'Validate input', error);
  return { success: false, workflow: 'crm-enrichment', input: { company: input.company, url: input.url }, trace: trace.steps, warnings: trace.warnings, error, metadata: { generatedAt: new Date().toISOString(), durationMs: Date.now() - started } };
}

function heuristicCrm(company: string, title: string, content: string, contacts: { emails: string[]; phones: string[] }): CrmEnrichmentOutput {
  const lowered = content.toLowerCase();
  const tags = new Set<string>();
  if (/restaurant|cafe|menu|food|lunch/.test(lowered)) tags.add('hospitality');
  if (/construction|bygg|renov|roof|tak|paint|måleri/.test(lowered)) tags.add('trades');
  if (/clinic|health|vård|therapy|salon|beauty/.test(lowered)) tags.add('local-service');
  if (contacts.emails.length === 0 && contacts.phones.length === 0) tags.add('missing-contact-data');
  if (content.length < 500) tags.add('thin-public-profile');

  return {
    companyName: title || company,
    industry: tags.size ? Array.from(tags)[0] : null,
    businessType: 'public website lead',
    location: null,
    summary: content ? 'Public website content was available and can seed CRM notes. Human review recommended before outreach.' : 'No public website content was available, so this is a low-confidence CRM stub.',
    crmTags: Array.from(tags).slice(0, 6),
    leadScore: content.length > 1200 ? 62 : 38,
    recommendedSegment: 'research-required',
    suggestedNextAction: contacts.emails.length || contacts.phones.length ? 'Verify contact details and write a specific first-touch note.' : 'Find a verified contact channel before outreach.',
    contact: contacts,
    confidence: content.length > 1200 ? 'medium' : 'low',
  };
}
