#!/usr/bin/env node

import assert from 'node:assert/strict';
import { betterTokenLocales, xDefaultLanguage } from './i18n-locales.mjs';

const siteUrl = 'https://docs.bettertoken.ai';
const legacyRoutes = [
  ['faq/claude-desktop-cowork-code-gateway', 'faq/claude-desktop/cowork-code-gateway'],
  ['faq/claude-desktop-third-party-models', 'faq/claude-desktop/third-party-models'],
  ['faq/codex-official-login-third-party-api', 'faq/codex/official-login-third-party-api'],
];
const localeRoutes = [
  ...betterTokenLocales.map(({ routePrefix }) => ({ oldPrefix: routePrefix, newPrefix: routePrefix })),
  { oldPrefix: 'ru/', newPrefix: '' },
];

function absoluteUrl(pathname) {
  return new URL(pathname, siteUrl).href.replace(/\/$/, '');
}

function canonicalFromHtml(html) {
  return html.match(/<link[^>]+rel="canonical"[^>]+href="([^"]+)"/i)?.[1];
}

async function fetchWithoutRedirect(url) {
  const attempts = 3;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        redirect: 'manual',
        headers: { 'user-agent': 'BetterToken SEO deployment check' },
      });

      if (response.status < 500 || attempt === attempts) return response;
    } catch (error) {
      if (attempt === attempts) throw error;
    }

    await new Promise((resolve) => setTimeout(resolve, attempt * 1_000));
  }
}

async function fetchLocalizedSitemap() {
  const attempts = Number(process.env.BETTERTOKEN_SEO_CHECK_ATTEMPTS ?? 5);

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const response = await fetchWithoutRedirect(`${siteUrl}/sitemap.xml`);
    const xml = await response.text();
    if (response.status === 200 && xml.includes('hreflang="hi-IN"')) return xml;
    if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 15_000));
  }

  throw new Error(`Live sitemap did not expose hreflang after ${attempts} attempts`);
}

const sitemap = await fetchLocalizedSitemap();
const sitemapBlocks = new Map();

for (const match of sitemap.matchAll(/<url>\s*([\s\S]*?)\s*<\/url>/g)) {
  const block = match[1];
  const loc = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
  if (loc) sitemapBlocks.set(loc.replace(/\/$/, ''), block);
}

for (const [legacyRoute, destinationRoute] of legacyRoutes) {
  for (const { oldPrefix, newPrefix } of localeRoutes) {
    const oldUrl = absoluteUrl(`/${oldPrefix}${legacyRoute}`);
    const destinationUrl = absoluteUrl(`/${newPrefix}${destinationRoute}`);
    const redirectResponse = await fetchWithoutRedirect(oldUrl);

    assert(
      redirectResponse.status === 301 || redirectResponse.status === 308,
      `${oldUrl} must return a permanent redirect, received ${redirectResponse.status}`,
    );
    assert.equal(
      new URL(redirectResponse.headers.get('location'), oldUrl).href.replace(/\/$/, ''),
      destinationUrl,
      `${oldUrl} must redirect directly to its canonical destination`,
    );

    const destinationResponse = await fetchWithoutRedirect(destinationUrl);
    assert.equal(destinationResponse.status, 200, `${destinationUrl} must return 200 after one redirect`);
    assert.equal(destinationResponse.headers.get('location'), null, `${destinationUrl} must not redirect again`);

    const destinationHtml = await destinationResponse.text();
    assert.equal(canonicalFromHtml(destinationHtml), destinationUrl, `${destinationUrl} must be self-canonical`);
    assert(sitemapBlocks.has(destinationUrl), `${destinationUrl} must appear in the sitemap`);
    assert(!sitemap.includes(oldUrl), `${oldUrl} must not appear in the sitemap`);
  }
}

const expectedHreflangs = [...betterTokenLocales.map(({ hreflang }) => hreflang), 'x-default'];
const xDefaultHreflang = betterTokenLocales.find(
  ({ language }) => language === xDefaultLanguage,
).hreflang;
for (const [url, block] of sitemapBlocks) {
  const alternates = new Map(
    [...block.matchAll(/hreflang="([^"]+)" href="([^"]+)"/g)].map((match) => [match[1], match[2]]),
  );
  assert.deepEqual([...alternates.keys()], expectedHreflangs, `${url} must declare all hreflang variants`);
  assert.equal(
    alternates.get('x-default'),
    alternates.get(xDefaultHreflang),
    `${url} x-default must point to English`,
  );

  for (const alternateUrl of new Set(alternates.values())) {
    const alternateBlock = sitemapBlocks.get(alternateUrl);
    assert(alternateBlock, `${url} references missing alternate ${alternateUrl}`);
    for (const [language, href] of alternates) {
      assert(
        alternateBlock.includes(`hreflang="${language}" href="${href}"`),
        `${alternateUrl} must reciprocally reference ${language} ${href}`,
      );
    }
  }
}

const sitemapUrls = [...sitemapBlocks.keys()];
const sitemapFailures = [];
let nextSitemapUrl = 0;

async function checkSitemapUrlResponses() {
  while (nextSitemapUrl < sitemapUrls.length) {
    const url = sitemapUrls[nextSitemapUrl];
    nextSitemapUrl += 1;
    const response = await fetchWithoutRedirect(url);

    if (response.status !== 200 || response.headers.get('location')) {
      const redirect = response.headers.get('location');
      sitemapFailures.push(`${url}: ${response.status}${redirect ? ` -> ${redirect}` : ''}`);
    }
  }
}

await Promise.all(Array.from({ length: 8 }, () => checkSitemapUrlResponses()));
assert.equal(
  sitemapFailures.length,
  0,
  `Every sitemap URL must return 200 without redirect:\n${sitemapFailures.join('\n')}`,
);

const langChecks = betterTokenLocales.map(({ routePrefix, hreflang }) => [
  `/${routePrefix}ai-tools/zed`,
  hreflang,
]);
const langLimitations = [];

for (const [pathname, expectedLang] of langChecks) {
  const response = await fetchWithoutRedirect(`${siteUrl}${pathname}`);
  const html = await response.text();
  const actualLang = html.match(/<html[^>]+lang="([^"]+)"/i)?.[1];
  if (actualLang !== expectedLang) {
    langLimitations.push(`${pathname}: expected ${expectedLang}, received ${actualLang ?? 'none'}`);
  }
}

if (langLimitations.length) {
  console.warn('Mintlify platform limitation: server-rendered html lang is not route-aware.');
  for (const limitation of langLimitations) console.warn(`- ${limitation}`);
}

console.log(`Live BetterToken SEO check passed (${sitemapBlocks.size} sitemap URLs).`);
