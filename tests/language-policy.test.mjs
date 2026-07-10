import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const repoRoot = new URL('..', import.meta.url).pathname;
const prompts = readFileSync(join(repoRoot, 'src/lib/prompts.ts'), 'utf8');
const landingPage = readFileSync(join(repoRoot, 'src/frontend/landing-page.ts'), 'utf8');
const followUpWorkflow = readFileSync(join(repoRoot, 'src/workflows/follow-up-draft.ts'), 'utf8');

test('workflow prompts force generated output to English', () => {
  const systemPromptExports = [
    'PROSPECT_RESEARCH_SYSTEM',
    'CRM_ENRICHMENT_SYSTEM',
    'FOLLOW_UP_DRAFT_SYSTEM',
  ];

  assert.match(prompts, /Output language: English only/);
  assert.match(prompts, /Translate the offer context into English/);
  for (const exportName of systemPromptExports) {
    const exportIndex = prompts.indexOf(exportName);
    assert.notEqual(exportIndex, -1, exportName + ' export should exist');
    const promptChunk = prompts.slice(exportIndex, prompts.indexOf('`;', exportIndex));
    assert.match(promptChunk, /OUTPUT_LANGUAGE_RULE/, exportName + ' should include the shared English-only rule');
  }
});

test('visible workflow sample data is English-facing', () => {
  assert.doesNotMatch(landingPage, /Berghs|Piteå|Skönhetsvård|piteahud|Northvolt/);
  assert.match(landingPage, /Cloudflare/);
  assert.match(landingPage, /Northwind Dental Studio/);
  assert.match(landingPage, /next action in English/);
});

test('follow-up fallback avoids echoing Swedish offer text', () => {
  assert.match(followUpWorkflow, /const offerLine = englishOfferLine\(offer\)/);
  assert.match(followUpWorkflow, /AI receptionist and lead capture automation/);
  assert.doesNotMatch(followUpWorkflow, /const offerLine = offer \|\|/);
});
