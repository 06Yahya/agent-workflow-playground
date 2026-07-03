import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import test from 'node:test';

const repoRoot = new URL('..', import.meta.url).pathname;
const buildDir = mkdtempSync(join(tmpdir(), 'awp-scraper-'));

execFileSync(
  'npx',
  ['tsc', 'src/lib/scraper.ts', '--outDir', buildDir, '--module', 'NodeNext', '--target', 'ES2022', '--moduleResolution', 'NodeNext', '--skipLibCheck'],
  { cwd: repoRoot, stdio: 'pipe' },
);

const { cleanHtml, extractContacts } = await import(pathToFileURL(join(buildDir, 'scraper.js')).href);
process.on('exit', () => rmSync(buildDir, { recursive: true, force: true }));

test('cleanHtml removes script content and keeps readable text', () => {
  const html = '<h1>Acme</h1><script>bad()</script><p>Fast &amp; useful</p>';
  assert.equal(cleanHtml(html), 'Acme\n\nFast & useful');
});

test('extractContacts finds emails and phone-like values from visible text', () => {
  const contacts = extractContacts('<p>Email HELLO@EXAMPLE.COM or call +46 70 123 45 67.</p>', 'Email HELLO@EXAMPLE.COM or call +46 70 123 45 67.');
  assert.deepEqual(contacts.emails, ['hello@example.com']);
  assert.equal(contacts.phones[0], '+46 70 123 45 67');
});

test('extractContacts prefers mailto and tel links and ignores script noise', () => {
  const html = [
    '<script>{"published":"2026-07-03","ids":[1541832169446192,112730472088171]}</script>',
    '<a href="mailto:hello@example.com?subject=hi">Email</a>',
    '<a href="tel:+46%2070%20123%2045%2067">Call</a>',
  ].join('');

  const cleaned = 'Reach us at sales@example.com or +46 8 123 45 67.';
  const contacts = extractContacts(html, cleaned);

  assert.deepEqual(contacts.emails.sort(), ['hello@example.com', 'sales@example.com']);
  assert.deepEqual(contacts.phones.sort(), ['+46 70 123 45 67', '+46 8 123 45 67']);
  assert.equal(contacts.phones.some((value) => value.includes('2026-07-03')), false);
  assert.equal(contacts.phones.some((value) => value.includes('1541832169446192')), false);
});
