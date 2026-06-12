#!/usr/bin/env node

import { indexNowHost, indexNowKey, indexNowKeyFileName, indexNowSitemapUrl } from './indexnow-config.mjs';

const endpoint = process.env.INDEXNOW_ENDPOINT ?? 'https://api.indexnow.org/indexnow';
const sitemapUrl = process.env.INDEXNOW_SITEMAP_URL ?? indexNowSitemapUrl;
const keyLocation = process.env.INDEXNOW_KEY_LOCATION ?? `https://${indexNowHost}/${indexNowKeyFileName}`;
const isDryRun =
  process.argv.includes('--dry-run') || ['1', 'true'].includes((process.env.INDEXNOW_DRY_RUN ?? '').toLowerCase());
const maxUrlsPerRequest = 10000;

function decodeXmlEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#[0-9]+|amp|lt|gt|quot|apos);/gi, (match, entity) => {
    const normalized = entity.toLowerCase();

    if (normalized.startsWith('#x')) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(2), 16));
    }

    if (normalized.startsWith('#')) {
      return String.fromCodePoint(Number.parseInt(normalized.slice(1), 10));
    }

    return {
      amp: '&',
      lt: '<',
      gt: '>',
      quot: '"',
      apos: "'",
    }[normalized] ?? match;
  });
}

function extractSitemapUrls(xml) {
  const urls = [...xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/gi)].map((match) => decodeXmlEntities(match[1].trim()));
  const seen = new Set();

  return urls.filter((url) => {
    try {
      const parsed = new URL(url);
      const isAllowed = parsed.protocol === 'https:' && parsed.hostname === indexNowHost;

      if (!isAllowed || seen.has(url)) {
        return false;
      }

      seen.add(url);
      return true;
    } catch {
      return false;
    }
  });
}

function chunkUrls(urls) {
  const chunks = [];

  for (let index = 0; index < urls.length; index += maxUrlsPerRequest) {
    chunks.push(urls.slice(index, index + maxUrlsPerRequest));
  }

  return chunks;
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'RealBetterToken-docs-indexnow/1.0',
    },
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: HTTP ${response.status}\n${body}`);
  }

  return body;
}

async function submitUrls(urls, chunkIndex, chunkCount) {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'user-agent': 'RealBetterToken-docs-indexnow/1.0',
    },
    body: JSON.stringify({
      host: indexNowHost,
      key: indexNowKey,
      keyLocation,
      urlList: urls,
    }),
  });
  const body = await response.text();

  if (![200, 202].includes(response.status)) {
    throw new Error(`IndexNow submission failed for chunk ${chunkIndex}/${chunkCount}: HTTP ${response.status}\n${body}`);
  }

  console.log(`IndexNow accepted chunk ${chunkIndex}/${chunkCount}: ${urls.length} URL(s), HTTP ${response.status}.`);
}

const sitemapXml = await fetchText(sitemapUrl);
const urls = extractSitemapUrls(sitemapXml);

if (!urls.length) {
  throw new Error(`No ${indexNowHost} URLs found in ${sitemapUrl}`);
}

const chunks = chunkUrls(urls);

if (isDryRun) {
  console.log(`IndexNow dry run: ${urls.length} URL(s) from ${sitemapUrl}.`);
  console.log(`IndexNow dry run: ${chunks.length} request(s) would be sent to ${endpoint}.`);
  process.exit(0);
}

for (let index = 0; index < chunks.length; index += 1) {
  await submitUrls(chunks[index], index + 1, chunks.length);
}
