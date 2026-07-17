#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const defaultConfigPath = path.join(rootDir, '.mintlify-llmeasy', 'docs.json');
const defaultOutputPath = path.join(rootDir, '.mintlify-llmeasy', 'sitemap.xml');

export const llmEasySiteUrl = 'https://docs.llmeasy.ru';
export const llmEasyLanguages = [
  { language: 'ru', routePrefix: '', hreflang: 'ru' },
  { language: 'en', routePrefix: 'en/', hreflang: 'en' },
  { language: 'zh', routePrefix: 'zh/', hreflang: 'zh-CN' },
];

function collectNavPages(node, pages = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectNavPages(item, pages);
    return pages;
  }

  if (typeof node === 'string') {
    pages.push(node.replace(/^\//, ''));
    return pages;
  }

  if (!node || typeof node !== 'object') return pages;

  for (const key of ['tabs', 'groups', 'pages']) {
    if (key in node) collectNavPages(node[key], pages);
  }

  return pages;
}

function escapeXml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function canonicalPath(routePrefix, route) {
  const pathParts = [routePrefix.replace(/\/$/, ''), route === 'index' ? '' : route].filter(Boolean);
  return pathParts.length ? `/${pathParts.join('/')}` : '';
}

export function localizedRouteGroups(config) {
  const groups = new Map();

  for (const definition of llmEasyLanguages) {
    const languageNavigation = config.navigation?.languages?.find(
      (item) => item.language === definition.language,
    );
    if (!languageNavigation) {
      throw new Error(`LLMEasy navigation is missing ${definition.language}`);
    }

    for (const page of new Set(collectNavPages(languageNavigation))) {
      if (definition.routePrefix && !page.startsWith(definition.routePrefix)) {
        throw new Error(`${definition.language} page must start with ${definition.routePrefix}: ${page}`);
      }

      const route = definition.routePrefix ? page.slice(definition.routePrefix.length) : page;
      const url = `${llmEasySiteUrl}${canonicalPath(definition.routePrefix, route)}`;
      const group = groups.get(route) ?? new Map();
      group.set(definition.hreflang, url);
      groups.set(route, group);
    }
  }

  return groups;
}

export function buildLlmeasySitemap(config) {
  const groups = localizedRouteGroups(config);
  const entries = [];

  for (const route of [...groups.keys()].sort()) {
    const variants = groups.get(route);
    const russianUrl = variants.get('ru');
    const alternates = llmEasyLanguages
      .filter(({ hreflang }) => variants.has(hreflang))
      .map(({ hreflang }) => [hreflang, variants.get(hreflang)]);

    if (russianUrl) alternates.push(['x-default', russianUrl]);

    for (const { hreflang } of llmEasyLanguages) {
      const url = variants.get(hreflang);
      if (!url) continue;

      entries.push([
        '  <url>',
        `    <loc>${escapeXml(url)}</loc>`,
        ...alternates.map(
          ([alternateLanguage, alternateUrl]) =>
            `    <xhtml:link rel="alternate" hreflang="${alternateLanguage}" href="${escapeXml(alternateUrl)}" />`,
        ),
        '  </url>',
      ].join('\n'));
    }
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ...entries,
    '</urlset>',
    '',
  ].join('\n');
}

export async function generateLlmeasySitemap({
  configPath = defaultConfigPath,
  outputPath = defaultOutputPath,
} = {}) {
  const config = JSON.parse(await readFile(configPath, 'utf8'));
  const sitemap = buildLlmeasySitemap(config);
  await writeFile(outputPath, sitemap);
  return sitemap;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await generateLlmeasySitemap();
  console.log(`Generated LLMEasy hreflang sitemap at ${path.relative(rootDir, defaultOutputPath)}`);
}
