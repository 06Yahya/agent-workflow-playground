const baseUrl = process.argv[2];
if (!baseUrl) {
  console.error('Usage: node scripts/verify-remote.mjs <base-url>');
  process.exit(1);
}

async function post(path, body) {
  const res = await fetch(baseUrl + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'User-Agent': 'agent-workflow-playground-verifier' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  return { status: res.status, data };
}

const health = await fetch(baseUrl + '/api/health', { headers: { 'User-Agent': 'agent-workflow-playground-verifier' } });
console.log('health', health.status, await health.text());
if (!health.ok) process.exit(1);

const prospect = await post('/api/prospect-research', { url: 'https://example.com' });
console.log('prospect-research', prospect.status, prospect.data.success, prospect.data.workflow, Boolean(prospect.data.output?.report));
if (!prospect.data.success || prospect.data.workflow !== 'prospect-research' || !prospect.data.output?.report) process.exit(1);

const crm = await post('/api/crm-enrichment', { company: 'Example CRM lead', url: 'https://example.com' });
console.log('crm-enrichment', crm.status, crm.data.success, crm.data.workflow);
if (!crm.data.success || crm.data.workflow !== 'crm-enrichment') process.exit(1);

const follow = await post('/api/follow-up-draft', { thread: 'Hi Yahya, sounds interesting. Can you send pricing?' });
console.log('follow-up-draft', follow.status, follow.data.success, follow.data.output?.temperature);
if (!follow.data.success || follow.data.workflow !== 'follow-up-draft') process.exit(1);
