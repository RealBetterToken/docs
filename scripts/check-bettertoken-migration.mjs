#!/usr/bin/env node

import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mapPath = path.join(
  rootDir,
  '.github',
  'migrations',
  'bettertoken-to-llmeasy',
  'redirect-map.csv',
);
const expectRedirects = process.argv.includes('--expect-redirects');

function parseCsvLine(line) {
  const cells = [];
  let cell = '';
  let quoted = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];

    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        cell += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === ',' && !quoted) {
      cells.push(cell);
      cell = '';
    } else {
      cell += character;
    }
  }

  cells.push(cell);
  return cells;
}

function normalizedUrl(value) {
  return new URL(value).href;
}

async function fetchPage(url, redirect = 'follow') {
  let lastError;

  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      return await fetch(url, {
        redirect,
        headers: { 'user-agent': 'LLMEasy migration validator' },
        signal: AbortSignal.timeout(30_000),
      });
    } catch (error) {
      lastError = error;

      if (attempt < 3) {
        await new Promise((resolve) => setTimeout(resolve, attempt * 500));
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : String(lastError);
  throw new Error(`${url}: ${message}`);
}

async function runPool(items, worker, concurrency = 8) {
  const queue = [...items];
  const errors = [];

  await Promise.all(
    Array.from({ length: Math.min(concurrency, queue.length) }, async () => {
      while (queue.length > 0) {
        const item = queue.shift();

        try {
          await worker(item);
        } catch (error) {
          errors.push(error instanceof Error ? error.message : String(error));
        }
      }
    }),
  );

  return errors;
}

const lines = (await readFile(mapPath, 'utf8')).trim().split('\n');
const header = parseCsvLine(lines.shift());
const rows = lines
  .map((line) => Object.fromEntries(header.map((key, index) => [key, parseCsvLine(line)[index]])))
  .filter((row) => row.action === 'redirect');

const targetUrls = [...new Set(rows.map((row) => row.target_url))];
const targetErrors = await runPool(targetUrls, async (targetUrl) => {
  const response = await fetchPage(targetUrl);

  if (response.status !== 200) {
    throw new Error(`${targetUrl}: expected 200, received ${response.status}`);
  }

  const html = await response.text();
  const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']+)["'][^>]*>/i)?.[1];

  if (!canonical) {
    throw new Error(`${targetUrl}: canonical not found`);
  }

  if (normalizedUrl(canonical) !== normalizedUrl(targetUrl)) {
    throw new Error(`${targetUrl}: canonical points to ${canonical}`);
  }
});

let redirectErrors = [];

if (expectRedirects) {
  redirectErrors = await runPool(rows, async (row) => {
    const response = await fetchPage(row.old_url, 'manual');

    if (![301, 308].includes(response.status)) {
      throw new Error(`${row.old_url}: expected 301/308, received ${response.status}`);
    }

    const location = response.headers.get('location');

    if (!location || normalizedUrl(new URL(location, row.old_url)) !== normalizedUrl(row.target_url)) {
      throw new Error(`${row.old_url}: redirects to ${location ?? 'no location header'}`);
    }
  });
}

const errors = [...targetErrors, ...redirectErrors];

console.log(`Validated ${targetUrls.length} unique LLMEasy targets`);

if (expectRedirects) {
  console.log(`Validated ${rows.length} BetterToken permanent redirects`);
}

if (errors.length > 0) {
  console.error(`Validation failed with ${errors.length} error(s):`);
  errors.forEach((error) => console.error(`- ${error}`));
  process.exitCode = 1;
} else {
  console.log('Migration validation passed');
}
