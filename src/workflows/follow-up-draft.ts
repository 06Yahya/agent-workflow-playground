import { runInferenceStructured } from '../lib/ai';
import { followUpDraftUser, FOLLOW_UP_DRAFT_SYSTEM } from '../lib/prompts';
import { measure, WorkflowTrace } from '../lib/trace';
import type { WorkflowEnvelope } from '../types';

export interface FollowUpDraftInput {
  thread: string;
  offer?: string;
}

export interface FollowUpDraftOutput {
  temperature: 'hot' | 'warm' | 'cold' | 'dead';
  reasoning: string;
  draftSubject: string;
  draftEmail: string;
  nextAction: string;
  riskFlags: string[];
}

export async function runFollowUpDraft(ai: Ai, input: FollowUpDraftInput): Promise<WorkflowEnvelope<FollowUpDraftOutput>> {
  const trace = new WorkflowTrace();
  const started = Date.now();
  const thread = input.thread.trim();
  if (!thread) {
    trace.fail('validate', 'Validate thread', 'Missing required field: thread');
    return { success: false, workflow: 'follow-up-draft', input: {}, trace: trace.steps, warnings: trace.warnings, error: 'Missing required field: thread', metadata: { generatedAt: new Date().toISOString(), durationMs: Date.now() - started } };
  }

  trace.step('read', 'Read thread context', 'Received ' + thread.length + ' characters of conversation context.');
  try {
    const { result, durationMs } = await measure(() =>
      runInferenceStructured<FollowUpDraftOutput>(ai, FOLLOW_UP_DRAFT_SYSTEM, followUpDraftUser(thread, input.offer), { maxTokens: 900, temperature: 0.2 }),
    );
    if (result.data) {
      trace.step('classify', 'Classify lead temperature', 'Model classified lead as ' + result.data.temperature + '.', 'complete', durationMs);
      trace.step('draft', 'Draft follow-up', 'Returned subject, email body, next action, and risk flags.');
      return success(input, trace, started, result.data, result.model);
    }
    trace.warn('parse', 'Parse structured output', 'Model returned non-JSON. Falling back to rule-based draft.', durationMs);
    return success(input, trace, started, heuristicDraft(thread, input.offer), result.model);
  } catch (error) {
    trace.warn('classify', 'Classify lead temperature', error instanceof Error ? error.message : 'AI inference failed');
    return success(input, trace, started, heuristicDraft(thread, input.offer));
  }
}

function success(input: FollowUpDraftInput, trace: WorkflowTrace, started: number, output: FollowUpDraftOutput, model?: string): WorkflowEnvelope<FollowUpDraftOutput> {
  return {
    success: true,
    workflow: 'follow-up-draft',
    input: { threadLength: input.thread.length, offer: input.offer },
    output,
    trace: trace.steps,
    warnings: trace.warnings,
    metadata: { generatedAt: new Date().toISOString(), durationMs: Date.now() - started, model },
  };
}

function heuristicDraft(thread: string, offer?: string): FollowUpDraftOutput {
  const lower = thread.toLowerCase();
  const positive = /interested|sounds good|book|call|meeting|yes|gärna|intressant/.test(lower);
  const negative = /not interested|unsubscribe|no thanks|nej tack|stop/.test(lower);
  const question = /\?|price|cost|pricing|pris|hur mycket/.test(lower);
  const temperature: FollowUpDraftOutput['temperature'] = negative ? 'dead' : positive ? 'hot' : question ? 'warm' : 'cold';
  const offerLine = englishOfferLine(offer);

  return {
    temperature,
    reasoning: negative ? 'The thread contains a clear rejection.' : positive ? 'The thread contains explicit interest or booking intent.' : question ? 'The lead asked a question but has not committed.' : 'No clear engagement signal was found.',
    draftSubject: temperature === 'cold' ? 'Quick follow-up' : 'Next step',
    draftEmail: 'Hi,\n\nFollowing up on my last note about ' + offerLine + '. If this is relevant, I can send a short example of what it would look like for your business. If not, no worries.\n\nBest,\nYahya',
    nextAction: temperature === 'dead' ? 'Do not follow up unless they re-engage.' : temperature === 'hot' ? 'Offer two specific call times.' : 'Send one concise follow-up with a concrete example.',
    riskFlags: temperature === 'cold' ? ['No explicit reply signal, keep it short.'] : [],
  };
}

function englishOfferLine(offer?: string): string {
  if (!offer) return 'AI agents and automation for SMBs';
  const lower = offer.toLowerCase();
  if (/\b(och|för|med|pris|uppsättning|kund|kunder)\b/.test(lower)) return 'AI receptionist and lead capture automation';
  return offer;
}
