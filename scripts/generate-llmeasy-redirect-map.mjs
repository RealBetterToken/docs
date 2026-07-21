#!/usr/bin/env node

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultOutput = path.join(
  rootDir,
  '.github',
  'migrations',
  'llmeasy-to-bettertoken',
  'redirect-map.csv',
);
const defaultCloudflareOutput = path.join(
  rootDir,
  '.github',
  'migrations',
  'llmeasy-to-bettertoken',
  'cloudflare-bulk-redirects.csv',
);

function readArgs(argv) {
  const options = {
    bettertokenSitemap: 'sitemap.xml',
    llmeasySitemap: 'https://docs.llmeasy.ru/sitemap.xml',
    additionalUrls: undefined,
    output: defaultOutput,
    cloudflareOutput: defaultCloudflareOutput,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    const value = argv[index + 1];

    if (!value || value.startsWith('--')) {
      throw new Error(`Missing value for ${argument}`);
    }

    if (argument === '--bettertoken-sitemap') {
      options.bettertokenSitemap = value;
    } else if (argument === '--llmeasy-sitemap') {
      options.llmeasySitemap = value;
    } else if (argument === '--additional-urls') {
      options.additionalUrls = value;
    } else if (argument === '--output') {
      options.output = path.resolve(rootDir, value);
    } else if (argument === '--cloudflare-output') {
      options.cloudflareOutput = path.resolve(rootDir, value);
    } else {
      throw new Error(`Unknown argument: ${argument}`);
    }

    index += 1;
  }

  return options;
}

async function readText(location) {
  if (/^https?:\/\//.test(location)) {
    const response = await fetch(location, {
      headers: { 'user-agent': 'BetterToken migration map generator' },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch ${location}: HTTP ${response.status}`);
    }

    return response.text();
  }

  return readFile(path.resolve(rootDir, location), 'utf8');
}

function sitemapUrls(xml, label) {
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());

  if (urls.length === 0) {
    throw new Error(`${label} does not contain any <loc> entries`);
  }

  return urls;
}

function additionalLlmeasyUrls(text) {
  return [
    ...new Set(
      [...text.matchAll(/https:\/\/docs\.llmeasy\.ru\/[A-Za-z0-9._~!$&'()*+;=:@%\/-]*/g)].map(
        (match) => match[0].replace(/[),.;]+$/, ''),
      ),
    ),
  ];
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function mapLanguagePath(oldPath) {
  return oldPath;
}

function resolveInternalRedirect(initialPath, redirects) {
  let currentPath = initialPath;
  const visited = new Set();

  while (redirects.has(currentPath)) {
    if (visited.has(currentPath)) {
      throw new Error(`Redirect cycle detected at ${currentPath}`);
    }

    visited.add(currentPath);
    currentPath = redirects.get(currentPath);
  }

  return currentPath;
}

const options = readArgs(process.argv.slice(2));
const [bettertokenXml, llmeasyXml, bettertokenConfigText] = await Promise.all([
  readText(options.bettertokenSitemap),
  readText(options.llmeasySitemap),
  readFile(path.join(rootDir, 'docs.json'), 'utf8'),
]);

const bettertokenUrls = new Set(sitemapUrls(bettertokenXml, 'BetterToken Sitemap'));
bettertokenUrls.add('https://docs.bettertoken.ai');
bettertokenUrls.add('https://docs.bettertoken.ai/');
const llmeasySitemapUrls = sitemapUrls(llmeasyXml, 'LLMEasy Sitemap');

const bettertokenConfig = JSON.parse(bettertokenConfigText);
const internalRedirects = new Map(
  (bettertokenConfig.redirects ?? []).map((redirect) => [redirect.source, redirect.destination]),
);

const sourcesByUrl = new Map();

function addSource(url, source) {
  const normalizedUrl = new URL(url).href;
  const sources = sourcesByUrl.get(normalizedUrl) ?? new Set();
  sources.add(source);
  sourcesByUrl.set(normalizedUrl, sources);
}

for (const url of llmeasySitemapUrls) {
  addSource(url, 'sitemap');
}

if (options.additionalUrls) {
  const additionalText = await readText(options.additionalUrls);

  for (const url of additionalLlmeasyUrls(additionalText)) {
    addSource(url, 'gsc');
  }
}

const rows = [...sourcesByUrl.entries()]
  .map(([oldUrl, sources]) => {
    const old = new URL(oldUrl);

    if (old.hostname !== 'docs.llmeasy.ru') {
      throw new Error(`Unexpected LLMEasy hostname: ${oldUrl}`);
    }

    const mappedPath = resolveInternalRedirect(mapLanguagePath(old.pathname), internalRedirects);
    const targetUrl = new URL(mappedPath, 'https://docs.bettertoken.ai').href;
    const matched = bettertokenUrls.has(targetUrl) || bettertokenUrls.has(targetUrl.replace(/\/$/, ''));

    return {
      oldUrl,
      action: matched ? 'redirect' : 'review',
      targetUrl: matched ? targetUrl : '',
      source: [...sources].sort().join('+'),
      validation: matched ? 'target-in-bettertoken-sitemap' : `no-target:${targetUrl}`,
    };
  })
  .sort((left, right) => left.oldUrl.localeCompare(right.oldUrl));

const csv = [
  ['old_url', 'action', 'target_url', 'source', 'validation'],
  ...rows.map((row) => [row.oldUrl, row.action, row.targetUrl, row.source, row.validation]),
]
  .map((row) => row.map(csvCell).join(','))
  .join('\n');

await mkdir(path.dirname(options.output), { recursive: true });
await writeFile(options.output, `${csv}\n`);

const cloudflareCsv = rows
  .filter((row) => row.action === 'redirect')
  .map((row) =>
    [row.oldUrl, row.targetUrl, 308, true, false, false, false].map(csvCell).join(','),
  )
  .join('\n');

await mkdir(path.dirname(options.cloudflareOutput), { recursive: true });
await writeFile(options.cloudflareOutput, `${cloudflareCsv}\n`);

const redirectCount = rows.filter((row) => row.action === 'redirect').length;
const reviewRows = rows.filter((row) => row.action === 'review');

console.log(`Wrote ${rows.length} rows to ${path.relative(rootDir, options.output)}`);
console.log(
  `Wrote ${redirectCount} Cloudflare redirects to ${path.relative(rootDir, options.cloudflareOutput)}`,
);
console.log(`Redirect: ${redirectCount}`);
console.log(`Review: ${reviewRows.length}`);

for (const row of reviewRows) {
  console.log(`- ${row.oldUrl} (${row.validation})`);
}
