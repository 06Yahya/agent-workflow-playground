/**
 * Agent Workflow Playground
 * Public Cloudflare Worker demo for operational agent workflows.
 */

import { landingPage } from './frontend/landing-page';
import { runCrmEnrichment } from './workflows/crm-enrichment';
import { runFollowUpDraft } from './workflows/follow-up-draft';
import { runProspectResearch } from './workflows/prospect-research';

interface Env {
  AI: Ai;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders });

    try {
      if (request.method === 'GET' && url.pathname === '/') {
        return new Response(landingPage, {
          headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=60',
          },
        });
      }

      if (request.method === 'GET' && url.pathname === '/api/health') {
        return jsonResponse({ ok: true, service: 'agent-workflow-playground', workflows: ['prospect-research', 'crm-enrichment', 'follow-up-draft'] });
      }

      if (request.method !== 'POST') {
        return jsonResponse({ error: 'Not found' }, 404);
      }

      const body = await parseJson(request);

      if (url.pathname === '/api/prospect-research') {
        if (!isRecord(body) || typeof body.url !== 'string') return jsonResponse({ error: 'Missing required field: url' }, 400);
        const result = await runProspectResearch(env.AI, { url: body.url });
        return jsonResponse(result, result.success ? 200 : 422);
      }

      if (url.pathname === '/api/crm-enrichment') {
        if (!isRecord(body) || typeof body.company !== 'string') return jsonResponse({ error: 'Missing required field: company' }, 400);
        const result = await runCrmEnrichment(env.AI, { company: body.company, url: typeof body.url === 'string' ? body.url : undefined });
        return jsonResponse(result, result.success ? 200 : 422);
      }

      if (url.pathname === '/api/follow-up-draft') {
        if (!isRecord(body) || typeof body.thread !== 'string') return jsonResponse({ error: 'Missing required field: thread' }, 400);
        const result = await runFollowUpDraft(env.AI, { thread: body.thread, offer: typeof body.offer === 'string' ? body.offer : undefined });
        return jsonResponse(result, result.success ? 200 : 422);
      }

      return jsonResponse({ error: 'Not found' }, 404);
    } catch (error) {
      return jsonResponse({ error: error instanceof Error ? error.message : 'Internal error' }, 500);
    }
  },
} satisfies ExportedHandler<Env>;

async function parseJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw new Error('Request body must be valid JSON');
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
