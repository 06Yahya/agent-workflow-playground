/**
 * Agent Workflow Playground — Cloudflare Worker
 *
 * Routes:
 *   GET  /               — Landing page / API docs
 *   POST /api/prospect-research  — Run prospect research agent
 *   POST /api/crm-enrichment     — Run CRM enrichment agent (coming soon)
 *   POST /api/follow-up-draft    — Run follow-up draft agent (coming soon)
 */

import { runProspectResearch } from './workflows/prospect-research';
import { runCrmEnrichment } from './workflows/crm-enrichment';
import { runFollowUpDraft } from './workflows/follow-up-draft';
import { landingPage } from './frontend/index.html.js';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const method = request.method;

    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    try {
      // Static landing page
      if (method === 'GET' && (url.pathname === '/' || url.pathname === '')) {
        return new Response(landingPage, {
          headers: { 'Content-Type': 'text/html; charset=utf-8', ...corsHeaders },
        });
      }

      // API routes
      if (method === 'POST' && url.pathname === '/api/prospect-research') {
        const body = await request.json() as { url?: string };
        if (!body.url) {
          return jsonResponse({ error: 'Missing required field: url' }, 400, corsHeaders);
        }
        const result = await runProspectResearch(env.AI, { url: body.url });
        return jsonResponse(result, result.success ? 200 : 422, corsHeaders);
      }

      if (method === 'POST' && url.pathname === '/api/crm-enrichment') {
        const body = await request.json() as { company?: string; url?: string };
        if (!body.company) {
          return jsonResponse({ error: 'Missing required field: company' }, 400, corsHeaders);
        }
        const result = await runCrmEnrichment(env.AI, body as { company: string; url?: string });
        return jsonResponse(result, 200, corsHeaders);
      }

      if (method === 'POST' && url.pathname === '/api/follow-up-draft') {
        const body = await request.json() as { thread?: string };
        if (!body.thread) {
          return jsonResponse({ error: 'Missing required field: thread' }, 400, corsHeaders);
        }
        const result = await runFollowUpDraft(env.AI, { thread: body.thread });
        return jsonResponse(result, 200, corsHeaders);
      }

      // 404
      return new Response(JSON.stringify({ error: 'Not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Internal error';
      return jsonResponse({ error: message }, 500, corsHeaders);
    }
  },
} satisfies ExportedHandler<Env>;

function jsonResponse(data: unknown, status: number, cors: Record<string, string>): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json', ...cors },
  });
}
