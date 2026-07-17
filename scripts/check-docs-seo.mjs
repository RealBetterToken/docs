#!/usr/bin/env node

import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const legacyRoutes = [
  ['faq/claude-desktop-cowork-code-gateway', 'faq/claude-desktop/cowork-code-gateway'],
  ['faq/claude-desktop-third-party-models', 'faq/claude-desktop/third-party-models'],
  ['faq/codex-official-login-third-party-api', 'faq/codex/official-login-third-party-api'],
];

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), 'utf8'));
}

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

  for (const key of ['languages', 'tabs', 'groups', 'pages']) {
    if (key in node) collectNavPages(node[key], pages);
  }

  return pages;
}

function assertLanguageRoutes(config, prefixes, label) {
  const languages = config.navigation?.languages ?? [];
  const normalized = new Map();

  for (const [language, prefix] of Object.entries(prefixes)) {
    const entry = languages.find((item) => item.language === language);
    assert(entry, `${label}: missing ${language} navigation`);

    const routes = new Set(collectNavPages(entry).map((route) => {
      assert(
        prefix === '' || route.startsWith(prefix),
        `${label}: ${language} route ${route} must start with ${prefix}`,
      );
      return prefix === '' ? route : route.slice(prefix.length);
    }));
    normalized.set(language, routes);
  }

  const [referenceLanguage, referenceRoutes] = normalized.entries().next().value;
  for (const [language, routes] of normalized) {
    assert.deepEqual(
      [...routes].sort(),
      [...referenceRoutes].sort(),
      `${label}: ${language} routes must match ${referenceLanguage} routes`,
    );
  }
}

function assertRedirects(config, prefixes, label) {
  const redirects = config.redirects ?? [];
  const redirectMap = new Map(redirects.map((redirect) => [redirect.source, redirect]));

  for (const [oldRoute, newRoute] of legacyRoutes) {
    for (const prefix of prefixes) {
      const source = `/${prefix}${oldRoute}`;
      const destination = `/${prefix}${newRoute}`;
      const redirect = redirectMap.get(source);

      assert(redirect, `${label}: missing redirect ${source}`);
      assert.equal(redirect.destination, destination, `${label}: wrong destination for ${source}`);
      assert.equal(redirect.permanent, true, `${label}: ${source} must be permanent`);
      assert(!redirectMap.has(destination), `${label}: ${source} must not create a redirect chain`);
    }
  }

  for (const redirect of redirects) {
    assert.equal(redirect.permanent, true, `${label}: ${redirect.source} must be permanent`);
  }

  const configWithoutRedirects = structuredClone(config);
  delete configWithoutRedirects.redirects;
  const userFacingConfig = JSON.stringify(configWithoutRedirects);
  for (const [oldRoute] of legacyRoutes) {
    assert(!userFacingConfig.includes(oldRoute), `${label}: legacy route remains outside redirects: ${oldRoute}`);
  }
}

function listMdxFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...listMdxFiles(absolutePath));
    if (entry.isFile() && entry.name.endsWith('.mdx')) files.push(absolutePath);
  }
  return files;
}

function readFrontmatter(relativePath) {
  const content = fs.readFileSync(path.join(rootDir, relativePath), 'utf8');
  const block = content.match(/^---\n([\s\S]*?)\n---/);
  assert(block, `${relativePath}: missing frontmatter`);

  const values = {};
  for (const line of block[1].split('\n')) {
    const match = line.match(/^(title|description):\s*["']?(.*?)["']?$/);
    if (match) values[match[1]] = match[2].trim();
  }
  return values;
}

const betterTokenConfig = readJson('docs.json');
const llmEasyConfig = readJson('docs.llmeasy.json');

assert.equal(
  betterTokenConfig.navigation.languages.find((item) => item.language === 'zh')?.default,
  true,
  'docs.json: Chinese must be the explicit default language',
);
assert.equal(
  llmEasyConfig.navigation.languages.find((item) => item.language === 'ru')?.default,
  true,
  'docs.llmeasy.json: Russian must be the explicit default language',
);

assertLanguageRoutes(betterTokenConfig, { zh: '', en: 'en/', ru: 'ru/' }, 'docs.json');
assertLanguageRoutes(llmEasyConfig, { zh: '', en: 'en/', ru: 'ru/' }, 'docs.llmeasy.json');
assertRedirects(betterTokenConfig, ['', 'en/', 'ru/'], 'docs.json');
assertRedirects(llmEasyConfig, ['', 'en/', 'zh/'], 'docs.llmeasy.json');
for (const [oldRoute, newRoute] of legacyRoutes) {
  const redirect = llmEasyConfig.redirects.find((item) => item.source === `/ru/${oldRoute}`);
  assert(redirect, `docs.llmeasy.json: missing historical Russian redirect /ru/${oldRoute}`);
  assert.equal(redirect.destination, `/${newRoute}`, `docs.llmeasy.json: /ru/${oldRoute} must use the default Russian route`);
  assert.equal(redirect.permanent, true, `docs.llmeasy.json: /ru/${oldRoute} must be permanent`);
}

const mdxFiles = listMdxFiles(rootDir).filter((file) => !file.includes(`${path.sep}.mintlify-llmeasy${path.sep}`));
for (const [oldRoute, newRoute] of legacyRoutes) {
  for (const prefix of ['', 'en/', 'ru/']) {
    assert(
      fs.existsSync(path.join(rootDir, `${prefix}${newRoute}.mdx`)),
      `Missing canonical page: ${prefix}${newRoute}.mdx`,
    );
    assert(
      !fs.existsSync(path.join(rootDir, `${prefix}${oldRoute}.mdx`)),
      `Legacy page must be removed: ${prefix}${oldRoute}.mdx`,
    );
  }

  for (const file of mdxFiles) {
    assert(
      !fs.readFileSync(file, 'utf8').includes(`/${oldRoute}`),
      `${path.relative(rootDir, file)}: contains legacy internal link /${oldRoute}`,
    );
  }
}

const zedFiles = ['ai-tools/zed.mdx', 'en/ai-tools/zed.mdx', 'ru/ai-tools/zed.mdx'];
const zedMetadata = zedFiles.map((file) => ({ file, ...readFrontmatter(file) }));
for (const metadata of zedMetadata) {
  assert(metadata.title, `${metadata.file}: title must not be empty`);
  assert(metadata.description, `${metadata.file}: description must not be empty`);
}
assert.equal(new Set(zedMetadata.map(({ title }) => title)).size, zedFiles.length, 'Zed titles must be unique');
assert.equal(
  new Set(zedMetadata.map(({ description }) => description)).size,
  zedFiles.length,
  'Zed descriptions must be unique',
);

const generatedConfigPath = path.join(rootDir, '.mintlify-llmeasy', 'docs.json');
if (fs.existsSync(generatedConfigPath)) {
  const generatedConfig = readJson('.mintlify-llmeasy/docs.json');
  assertLanguageRoutes(generatedConfig, { ru: '', en: 'en/', zh: 'zh/' }, 'generated LLMEasy docs.json');
  assertRedirects(generatedConfig, ['', 'en/', 'zh/'], 'generated LLMEasy docs.json');
  for (const [oldRoute, newRoute] of legacyRoutes) {
    const redirect = generatedConfig.redirects.find((item) => item.source === `/ru/${oldRoute}`);
    assert(redirect, `generated LLMEasy docs.json: missing historical Russian redirect /ru/${oldRoute}`);
    assert.equal(redirect.destination, `/${newRoute}`, `generated LLMEasy docs.json: /ru/${oldRoute} must use the default Russian route`);
  }
}

console.log('Documentation SEO checks passed.');
