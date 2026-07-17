#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  buildLlmeasySitemap,
  llmEasyLanguages,
  localizedRouteGroups,
} from './generate-llmeasy-sitemap.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const generatedRoot = path.join(rootDir, '.mintlify-llmeasy');
const config = JSON.parse(await readFile(path.join(generatedRoot, 'docs.json'), 'utf8'));
const sitemap = await readFile(path.join(generatedRoot, 'sitemap.xml'), 'utf8');
const expectedSitemap = buildLlmeasySitemap(config);
const routeGroups = localizedRouteGroups(config);
const legacyRoutes = [
  'faq/claude-desktop-cowork-code-gateway',
  'faq/claude-desktop-third-party-models',
  'faq/codex-official-login-third-party-api',
];

assert.equal(sitemap, expectedSitemap, 'Generated sitemap must match the localized navigation');
assert(sitemap.includes('xmlns:xhtml="http://www.w3.org/1999/xhtml"'), 'Sitemap must declare xhtml');

for (const legacyRoute of legacyRoutes) {
  assert(!sitemap.includes(`/${legacyRoute}<`), `Sitemap contains legacy URL /${legacyRoute}`);
}

const expectedLanguages = [...llmEasyLanguages.map(({ hreflang }) => hreflang), 'x-default'];
const urlBlocks = [...sitemap.matchAll(/<url>\n([\s\S]*?)\n  <\/url>/g)].map((match) => match[1]);
const expectedUrlCount = [...routeGroups.values()].reduce((count, variants) => count + variants.size, 0);
assert.equal(urlBlocks.length, expectedUrlCount, 'Sitemap URL count must match localized navigation');

for (const block of urlBlocks) {
  const links = [...block.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)];
  assert.deepEqual(
    links.map((match) => match[1]),
    expectedLanguages,
    'Every translated URL must reference ru, en, zh-CN, and x-default',
  );
  assert.equal(links.at(-1)[2], links[0][2], 'x-default must point to the default Russian URL');
}

console.log(`LLMEasy hreflang sitemap check passed (${urlBlocks.length} URLs).`);
