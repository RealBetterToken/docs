#!/usr/bin/env node

import { copyFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { generateBetterTokenSitemap } from './generate-bettertoken-sitemap.mjs';
import { indexNowKey, indexNowKeyFileName } from './indexnow-config.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(rootDir, 'docs.json');
const metricaTemplatePath = path.join(rootDir, 'scripts', 'llmeasy-metrica-spa.js.template');
const metricaOutputPath = path.join(rootDir, 'llmeasy-metrica-spa.js');

function walkNavPages(node, pages = []) {
  if (Array.isArray(node)) {
    for (const item of node) walkNavPages(item, pages);
    return pages;
  }

  if (typeof node === 'string') {
    pages.push(node.replace(/^\//, ''));
    return pages;
  }

  if (!node || typeof node !== 'object') return pages;

  for (const key of ['languages', 'tabs', 'groups', 'pages', 'anchors', 'dropdowns', 'versions']) {
    if (key in node) walkNavPages(node[key], pages);
  }

  return pages;
}

function frontmatter(text) {
  return text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
}

function frontmatterValue(metadata, key) {
  const match = metadata.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  return match?.[1]?.trim().replace(/^['"]|['"]$/g, '');
}

function resolveVariables(text, variables) {
  return text.replace(/\{\{([a-z0-9-]+)\}\}/gi, (match, name) => variables[name] ?? match);
}

function normalizeMdxContent(text, variables) {
  return resolveVariables(text.replace(/^---\n[\s\S]*?\n---\n?/, ''), variables)
    .replace(/^import\s.+$/gm, '')
    .replace(/^export\s.+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function pageUrl(siteUrl, page) {
  const pathname = page === 'index'
    ? ''
    : page.endsWith('/index')
      ? page.slice(0, -'/index'.length)
      : page;
  return pathname ? `${siteUrl}/${pathname}` : siteUrl;
}

async function generateLlmsFull() {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const variables = config.variables ?? {};
  const pages = [...new Set(walkNavPages(config.navigation))];
  const sections = [`# ${config.name ?? 'LLMEasy'}`];

  if (config.description) sections.push(`> ${config.description}`);

  for (const page of pages) {
    const text = await readFile(path.join(rootDir, `${page}.mdx`), 'utf8');
    const metadata = frontmatter(text);
    const title = resolveVariables(frontmatterValue(metadata, 'title') ?? page, variables);
    const description = resolveVariables(frontmatterValue(metadata, 'description') ?? '', variables);
    const content = normalizeMdxContent(text, variables);
    const parts = [`## ${title}`, `Source: ${pageUrl(variables['site-url'], page)}`];

    if (description) parts.push(`Description: ${description}`);
    if (content) parts.push(content);
    sections.push(parts.join('\n\n'));
  }

  if (config.api?.openapi) {
    const openapi = await readFile(path.join(rootDir, config.api.openapi), 'utf8');
    sections.push([
      '## OpenAPI specification',
      `Source: ${variables['site-url']}/${config.api.openapi}`,
      '```json',
      openapi.trim(),
      '```',
    ].join('\n\n'));
  }

  const output = `${sections.join('\n\n---\n\n')}\n`;
  const wellKnownDir = path.join(rootDir, '.well-known');
  await mkdir(wellKnownDir, { recursive: true });
  await writeFile(path.join(rootDir, 'llms-full.txt'), output);
  await writeFile(path.join(wellKnownDir, 'llms-full.txt'), output);
}

await generateBetterTokenSitemap({
  configPath,
  outputPath: path.join(rootDir, 'sitemap.xml'),
});
await generateLlmsFull();
await copyFile(metricaTemplatePath, metricaOutputPath);
await writeFile(path.join(rootDir, indexNowKeyFileName), `${indexNowKey}\n`);

console.log('Prepared BetterToken sitemap, llms-full, Metrica SPA script, and IndexNow key.');
