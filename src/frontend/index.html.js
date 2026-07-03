/**
 * Inline HTML landing page for the Agent Workflow Playground.
 * Exported as a JS string for the Worker to serve.
 *
 * Single-quote escaping: uses \x27 inside JS event handlers to avoid
 * wrangler template literal conflicts.
 */

export const landingPage = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>Agent Workflow Playground</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;
    background: #0a0a0f;
    color: #e0e0e0;
    line-height: 1.6;
    min-height: 100vh;
    display: flex;
    flex-direction: column;
  }
  header {
    background: linear-gradient(135deg, #0d1117 0%, #161b22 100%);
    border-bottom: 1px solid #30363d;
    padding: 3rem 1.5rem 2rem;
    text-align: center;
  }
  header h1 {
    font-size: 2rem;
    font-weight: 700;
    color: #f0f0f0;
    margin-bottom: 0.5rem;
  }
  header p {
    color: #8b949e;
    max-width: 560px;
    margin: 0 auto;
    font-size: 1.05rem;
  }
  header .tag {
    display: inline-block;
    margin-top: 1rem;
    padding: 0.25rem 0.75rem;
    border-radius: 999px;
    background: #1f2937;
    border: 1px solid #30363d;
    font-size: 0.8rem;
    color: #8b949e;
  }
  main { flex: 1; max-width: 720px; margin: 0 auto; padding: 2rem 1.5rem; width: 100%; }
  section { margin-bottom: 2.5rem; }
  h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #f0f0f0;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #21262d;
  }
  .workflow-card {
    background: #161b22;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 1.25rem;
    margin-bottom: 1rem;
  }
  .workflow-card h3 { color: #58a6ff; font-size: 1.05rem; margin-bottom: 0.5rem; }
  .workflow-card p { color: #8b949e; font-size: 0.9rem; margin-bottom: 0.75rem; }
  .workflow-card .status {
    display: inline-block;
    font-size: 0.75rem;
    padding: 0.15rem 0.5rem;
    border-radius: 4px;
    font-weight: 500;
  }
  .status.live { background: #0a3d1a; color: #3fb950; border: 1px solid #2ea043; }
  .status.coming { background: #1f2937; color: #8b949e; border: 1px solid #30363d; }
  .api-demo {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 8px;
    padding: 1.25rem;
    margin-bottom: 1rem;
  }
  .api-demo h3 { color: #d2a8ff; font-size: 0.95rem; margin-bottom: 0.75rem; }
  .api-demo label { display: block; font-size: 0.85rem; color: #8b949e; margin-bottom: 0.4rem; }
  .api-demo input {
    width: 100%;
    padding: 0.6rem 0.75rem;
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    color: #e0e0e0;
    font-size: 0.9rem;
    margin-bottom: 0.75rem;
  }
  .api-demo input:focus { outline: none; border-color: #58a6ff; }
  button {
    padding: 0.5rem 1.25rem;
    background: #238636;
    color: #fff;
    border: none;
    border-radius: 6px;
    font-size: 0.875rem;
    font-weight: 500;
    cursor: pointer;
  }
  button:hover { background: #2ea043; }
  button:disabled { opacity: 0.5; cursor: not-allowed; }
  pre {
    background: #0d1117;
    border: 1px solid #30363d;
    border-radius: 6px;
    padding: 1rem;
    font-size: 0.8rem;
    color: #c9d1d9;
    overflow-x: auto;
    white-space: pre-wrap;
    margin-top: 0.75rem;
    max-height: 400px;
    overflow-y: auto;
  }
  .error-box { color: #f85149; font-size: 0.875rem; margin-top: 0.5rem; }
  .loading { color: #8b949e; font-size: 0.875rem; margin-top: 0.5rem; }
  code { font-family: 'JetBrains Mono', 'Fira Code', monospace; font-size: 0.85em; }
  footer {
    text-align: center;
    padding: 2rem 1.5rem;
    color: #484f58;
    font-size: 0.8rem;
    border-top: 1px solid #21262d;
  }
  footer a { color: #58a6ff; text-decoration: none; }
  @media (max-width: 480px) {
    header h1 { font-size: 1.5rem; }
    main { padding: 1.25rem; }
  }
</style>
</head>
<body>
<header>
  <h1>Agent Workflow Playground</h1>
  <p>Practical agent workflows running on Cloudflare Workers AI. Try the prospect research agent below.</p>
  <span class="tag">Free tier — Workers AI (Llama 3)</span>
</header>
<main>
  <section>
    <h2>Workflows</h2>
    <div class="workflow-card">
      <h3>Prospect Research Agent</h3>
      <p>Input a company URL. The agent scrapes the site, analyses the content, and produces a structured audit covering conversion leaks, weak points, and actionable recommendations.</p>
      <span class="status live">Live</span>
    </div>
    <div class="workflow-card">
      <h3>CRM Enrichment Agent</h3>
      <p>Input a company name. The agent finds public business information and returns structured CRM-ready data.</p>
      <span class="status coming">Coming next</span>
    </div>
    <div class="workflow-card">
      <h3>Follow-Up Draft Agent</h3>
      <p>Input a previous email thread. The agent classifies lead temperature and drafts a concise follow-up.</p>
      <span class="status coming">Coming next</span>
    </div>
  </section>

  <section>
    <h2>Try It — Prospect Research</h2>
    <p style="color:#8b949e;font-size:0.85rem;margin-bottom:1rem;">
      Enter any company URL. The agent will scrape one page and produce an audit via Workers AI.
    </p>
    <div class="api-demo">
      <label for="url-input">Company URL</label>
      <input type="url" id="url-input" placeholder="e.g. https://example.com" />
      <button id="run-btn" onclick="runProspect()">Run Agent</button>
      <div id="status" class="loading"></div>
      <pre id="output">Results will appear here...</pre>
    </div>
  </section>

  <section>
    <h2>API</h2>
    <p style="color:#8b949e;font-size:0.85rem;">
      All workflows are available as <code>POST</code> endpoints. Send JSON with the required fields.
    </p>
    <div class="workflow-card" style="margin-top:1rem;">
      <code style="color:#58a6ff;">POST /api/prospect-research</code>
      <p style="color:#8b949e;font-size:0.8rem;margin-top:0.4rem;">
        Body: <code>{"url": "https://company.com"}</code>
      </p>
    </div>
    <div class="workflow-card">
      <code style="color:#8b949e;">POST /api/crm-enrichment</code>
      <p style="color:#8b949e;font-size:0.8rem;margin-top:0.4rem;">
        Body: <code>{"company": "Company Name", "url": "https://..."}</code>
        <span style="color:#484f58;margin-left:0.5rem;">(Coming next)</span>
      </p>
    </div>
    <div class="workflow-card">
      <code style="color:#8b949e;">POST /api/follow-up-draft</code>
      <p style="color:#8b949e;font-size:0.8rem;margin-top:0.4rem;">
        Body: <code>{"thread": "Previous email conversation..."}</code>
        <span style="color:#484f58;margin-left:0.5rem;">(Coming next)</span>
      </p>
    </div>
  </section>
</main>
<footer>
  <a href="https://github.com/06Yahya/agent-workflow-playground">GitHub</a>
  &mdash; Built with Cloudflare Workers + Workers AI (free tier)
</footer>
<script>
async function runProspect() {
  const url = document.getElementById('url-input').value.trim();
  const btn = document.getElementById('run-btn');
  const status = document.getElementById('status');
  const output = document.getElementById('output');

  if (!url) { output.textContent = 'Please enter a URL.'; return; }

  btn.disabled = true;
  status.textContent = 'Scraping site and running analysis...';
  output.textContent = '';

  try {
    const res = await fetch('/api/prospect-research', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    const data = await res.json();
    if (data.success && data.report) {
      output.textContent = data.report;
      status.textContent = 'Done.';
    } else {
      output.textContent = JSON.stringify(data, null, 2);
      status.textContent = data.error || 'Analysis failed.';
    }
  } catch (err) {
    output.textContent = 'Network error: ' + err.message;
    status.textContent = 'Request failed.';
  } finally {
    btn.disabled = false;
  }
}
</script>
</body>
</html>`;
