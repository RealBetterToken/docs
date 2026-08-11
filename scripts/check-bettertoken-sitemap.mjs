#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  betterTokenLanguages,
  buildBetterTokenSitemap,
  hiddenApiReferenceRoutes,
  localizedRouteGroups,
} from './generate-bettertoken-sitemap.mjs';
import { xDefaultLanguage } from './i18n-locales.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(rootDir, 'docs.json'), 'utf8'));
const sitemap = await readFile(path.join(rootDir, 'sitemap.xml'), 'utf8');
const expectedSitemap = buildBetterTokenSitemap(config);
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

for (const hiddenRoute of hiddenApiReferenceRoutes) {
  for (const { routePrefix } of betterTokenLanguages) {
    assert(
      !sitemap.includes(`/${routePrefix}${hiddenRoute}<`),
      `Sitemap contains hidden API URL /${routePrefix}${hiddenRoute}`,
    );
  }
}

const expectedLanguages = [...betterTokenLanguages.map(({ hreflang }) => hreflang), 'x-default'];
const xDefaultHreflang = betterTokenLanguages.find(
  ({ language }) => language === xDefaultLanguage,
).hreflang;
const urlBlocks = [...sitemap.matchAll(/<url>\n([\s\S]*?)\n  <\/url>/g)].map((match) => match[1]);
const expectedUrlCount = [...routeGroups.values()].reduce((count, variants) => count + variants.size, 0);
assert.equal(urlBlocks.length, expectedUrlCount, 'Sitemap URL count must match localized navigation');

for (const block of urlBlocks) {
  const links = [...block.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)];
  assert.deepEqual(
    links.map((match) => match[1]),
    expectedLanguages,
    'Every translated URL must reference every configured language and x-default',
  );
  const xDefaultTarget = links.find((match) => match[1] === xDefaultHreflang)[2];
  assert.equal(links.at(-1)[2], xDefaultTarget, 'x-default must point to the English URL');
}

console.log(`BetterToken hreflang sitemap check passed (${urlBlocks.length} URLs).`);
