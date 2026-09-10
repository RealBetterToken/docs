import assert from 'node:assert/strict';
import test from 'node:test';
import { buildReceipt, changedVisibleChanges, fetchPage, receiptForVerifiedPages } from './write-seo-page-receipt.mjs';

test('extracts body-only additions and removals for same-title deployment proof', () => {
  const changes = changedVisibleChanges('--- a/en/x.mdx\n+++ b/en/x.mdx\n-## Old final paragraph with enough distinctive words.\n+## New final paragraph with enough distinctive words.');
  assert.deepEqual(changes, { removed: ['Old final paragraph with enough distinctive words.'], added: ['New final paragraph with enough distinctive words.'] });
});

test('receipt uses the contract and records only supplied live pages', async () => {
  const receipt = await buildReceipt({
    sourceRevision: 'a'.repeat(40), releaseId: 'run-42', routes: ['en/quickstart.mdx'],
    readSource: async () => '---\ntitle: "Quickstart"\n---\n\nA new body paragraph with enough distinctive words.',
    diffImpl: async () => '-An old body paragraph with enough distinctive words.\n+A new body paragraph with enough distinctive words.',
    fetchPageImpl: async (_url, title, _excerpt, changes) => { assert.equal(title, 'Quickstart'); assert.deepEqual(changes.added, ['A new body paragraph with enough distinctive words.']); return 'sha256:live'; },
  });
  assert.equal(receipt.schema_version, 'seo-page-change-v1');
  assert.equal(receipt.verification, 'verified');
  assert.equal(receipt.deployed_at, null);
  assert.deepEqual(receipt.pages.map((page) => page.url), [
    'https://docs.bettertoken.ai/en/quickstart',
  ]);
});

test('same-title stale body is rejected and Mintlify title suffix with new body passes', async () => {
  const changes = { added: ['New changed paragraph with enough distinctive words.'], removed: ['Old changed paragraph with enough distinctive words.'], currentSource: 'New changed paragraph with enough distinctive words.' };
  await assert.rejects(() => fetchPage('https://docs.bettertoken.ai/en/quickstart', 'Quickstart', 'New changed paragraph with enough distinctive words.', changes, async () => new Response('<title>Quickstart | BetterToken</title><link rel="canonical" href="x">Old changed paragraph with enough distinctive words.', { status: 200 })), /does not contain checked-out body excerpt/);
  const fingerprint = await fetchPage('https://docs.bettertoken.ai/en/quickstart', 'Quickstart', 'New changed paragraph with enough distinctive words.', changes, async () => new Response('<title>Quickstart | BetterToken</title><link rel="canonical" href="x">New changed paragraph with enough distinctive words.', { status: 200 }));
  assert.match(fingerprint, /^sha256:/);
});

test('unmapped source is pending', async () => {
  const pending = await buildReceipt({ sourceRevision: 'b', releaseId: 'missing', routes: ['deleted-page.mdx'], readSource: async () => { throw new Error('missing'); }, diffImpl: async () => '' });
  assert.equal(pending.verification, 'pending');
});

test('event id is stable for the same release and page set', () => {
  const input = { sourceRevision: 'a', releaseId: 'run-42', verifiedAt: '2026-09-10T00:00:00Z', evidence: {}, pages: [{ url: 'https://docs.bettertoken.ai/en/x' }] };
  assert.equal(receiptForVerifiedPages(input).event_id, receiptForVerifiedPages(input).event_id);
});
