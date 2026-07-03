import assert from 'node:assert/strict';
import test from 'node:test';

function cleanHtml(html) {
  let text = html
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/h[1-6]>/gi, '\n\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&nbsp;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
  return text;
}

function extractContacts(text) {
  const emails = Array.from(new Set((text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) || []).map((value) => value.toLowerCase())));
  const phones = Array.from(new Set((text.match(/(?:\+?\d[\d\s().-]{7,}\d)/g) || []).map((value) => value.replace(/\s+/g, ' ').trim())));
  return { phones, emails };
}

test('cleanHtml removes script content and keeps readable text', () => {
  const html = '<h1>Acme</h1><script>bad()</script><p>Fast &amp; useful</p>';
  assert.equal(cleanHtml(html), 'Acme\n\n Fast & useful');
});

test('extractContacts finds emails and phone-like values', () => {
  const contacts = extractContacts('Email HELLO@EXAMPLE.COM or call +46 70 123 45 67.');
  assert.deepEqual(contacts.emails, ['hello@example.com']);
  assert.equal(contacts.phones[0], '+46 70 123 45 67');
});
