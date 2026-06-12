#!/usr/bin/env node

import { copyFile, lstat, mkdir, readdir, readFile, readlink, rename, rm, symlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { indexNowKey, indexNowKeyFileName } from './indexnow-config.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDir = path.resolve(rootDir, process.argv[2] ?? '.mintlify-llmeasy');
const llmeasyConfigPath = path.join(rootDir, 'docs.llmeasy.json');
const outputConfigPath = path.join(outputDir, 'docs.json');
const textExtensions = new Set(['.md', '.mdx', '.json', '.yml', '.yaml']);
const skippedTopLevelFiles = new Set([
  '.gitignore',
  'AGENTS.md',
  'CLAUDE.md',
  'CONTRIBUTING.md',
  'LICENSE',
  'README.md',
  'docs.llmeasy.json',
  'favicon.svg',
  'google_bettertoken_env.txt',
  'skills-lock.json',
]);
const skippedRelativeFiles = new Set([
  'ai-tools/yingdao-ai-power.mdx',
  'en/ai-tools/yingdao-ai-power.mdx',
  'ru/ai-tools/yingdao-ai-power.mdx',
  'images/checks-passed.png',
  'images/hero-dark.png',
  'images/hero-light.png',
  'logo/dark.svg',
  'logo/light.svg',
]);
const skippedRelativeDirs = new Set([
  'api-reference/endpoint',
  'images/temp',
]);

const skippedTopLevel = new Set([
  '.adal',
  '.agents',
  '.augment',
  '.claude',
  '.codebuddy',
  '.commandcode',
  '.continue',
  '.cortex',
  '.crush',
  '.factory',
  '.git',
  '.github',
  '.goose',
  '.gstack',
  '.idea',
  '.iflow',
  '.junie',
  '.kilocode',
  '.kiro',
  '.kode',
  '.mcpjam',
  '.mintlify-llmeasy',
  '.mux',
  '.neovate',
  'node_modules',
  'downloads',
  '.openhands',
  '.pi',
  '.pochi',
  '.qoder',
  '.qwen',
  '.roo',
  '.spec-workflow',
  'essentials',
  'scripts',
  'skills',
  'snippets',
  '.trae',
  '.vibe',
  '.windsurf',
  '.zencoder',
]);

function isInside(parent, child) {
  const relativePath = path.relative(parent, child);
  return relativePath === '' || (!relativePath.startsWith('..') && !path.isAbsolute(relativePath));
}

function shouldSkip(sourcePath, name) {
  if (name === '.DS_Store') {
    return true;
  }

  if (isInside(outputDir, sourcePath)) {
    return true;
  }

  const relativePath = path.relative(rootDir, sourcePath);
  if (skippedRelativeFiles.has(relativePath.split(path.sep).join('/'))) {
    return true;
  }

  if (skippedRelativeDirs.has(relativePath.split(path.sep).join('/'))) {
    return true;
  }

  const topLevelName = relativePath.split(path.sep)[0];
  if (relativePath === topLevelName && skippedTopLevelFiles.has(topLevelName)) {
    return true;
  }

  return skippedTopLevel.has(topLevelName);
}

async function copyTree(sourceDir, targetDir) {
  await mkdir(targetDir, { recursive: true });
  const entries = await readdir(sourceDir, { withFileTypes: true });

  for (const entry of entries) {
    const sourcePath = path.join(sourceDir, entry.name);
    const targetPath = path.join(targetDir, entry.name);

    if (shouldSkip(sourcePath, entry.name)) {
      continue;
    }

    if (entry.isDirectory()) {
      await copyTree(sourcePath, targetPath);
      continue;
    }

    if (entry.isSymbolicLink()) {
      const linkTarget = await readlink(sourcePath);
      await symlink(linkTarget, targetPath);
      continue;
    }

    if (entry.isFile()) {
      await copyFile(sourcePath, targetPath);
    }
  }
}

async function walkTextFiles(dir, files = []) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await walkTextFiles(filePath, files);
      continue;
    }

    if (entry.isFile() && textExtensions.has(path.extname(entry.name))) {
      files.push(filePath);
    }
  }

  return files;
}

function walkNavPages(node, pages = []) {
  if (!node) {
    return pages;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      walkNavPages(item, pages);
    }
    return pages;
  }

  if (typeof node === 'string') {
    pages.push(node);
    return pages;
  }

  if (typeof node === 'object') {
    if (typeof node.href === 'string' && !/^https?:\/\//.test(node.href)) {
      pages.push(node.href);
    }

    for (const key of ['languages', 'tabs', 'groups', 'pages', 'anchors', 'dropdowns', 'versions']) {
      walkNavPages(node[key], pages);
    }
  }

  return pages;
}

function frontmatter(text) {
  return text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
}

function frontmatterValue(metadata, key) {
  const match = metadata.match(new RegExp(`^${key}:\\s*(.+)$`, 'm'));
  if (!match) {
    return undefined;
  }

  return match[1].trim().replace(/^['"]|['"]$/g, '');
}

function stripFrontmatter(text) {
  return text.replace(/^---\n[\s\S]*?\n---\n?/, '').trim();
}

function resolveVariables(text, variables) {
  return text.replace(/\{\{([a-z0-9-]+)\}\}/gi, (match, name) => variables[name] ?? match);
}

function normalizeMdxContent(text, variables) {
  return resolveVariables(stripFrontmatter(text), variables)
    .replace(/^import\s.+$/gm, '')
    .replace(/^export\s.+$/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function remapNavPages(node, mapper) {
  if (!node) {
    return node;
  }

  if (Array.isArray(node)) {
    return node.map((item) => remapNavPages(item, mapper));
  }

  if (typeof node === 'string') {
    return mapper(node);
  }

  if (typeof node === 'object') {
    const next = { ...node };

    if (typeof next.href === 'string' && !/^https?:\/\//.test(next.href)) {
      next.href = mapper(next.href);
    }

    for (const key of ['languages', 'tabs', 'groups', 'pages', 'anchors', 'dropdowns', 'versions']) {
      if (next[key]) {
        next[key] = remapNavPages(next[key], mapper);
      }
    }

    return next;
  }

  return node;
}

function rewritePageLinks(text, mapper) {
  return text.replace(/(["'(=])\/([^"'()\s?#]+)([#?][^"'()\s]*)?/g, (match, prefix, route, suffix = '') => {
    const mapped = mapper(route);

    if (!mapped) {
      return match;
    }

    return `${prefix}/${mapped}${suffix}`;
  });
}

async function rewriteRegionalBrand() {
  const textFiles = await walkTextFiles(outputDir);

  for (const filePath of textFiles) {
    const original = await readFile(filePath, 'utf8');
    const updated = original
      .replaceAll('https://docs.bettertoken.ai', 'https://docs.llmeasy.ru')
      .replaceAll('https://www.bettertoken.ai', 'https://www.llmeasy.ru')
      .replaceAll('BetterToken', 'LLMEasy')
      .replaceAll('bettertoken', 'llmeasy')
      .replaceAll('BETTERTOKEN', 'LLMEASY');

    if (updated !== original) {
      await writeFile(filePath, updated);
    }
  }
}

async function rewritePage(filePath, mapper) {
  const original = await readFile(filePath, 'utf8');
  const updated = rewritePageLinks(original, mapper);

  if (updated !== original) {
    await writeFile(filePath, updated);
  }
}

async function movePage(fromPage, toPage) {
  if (fromPage === toPage) {
    return;
  }

  const fromPath = path.join(outputDir, `${fromPage}.mdx`);
  const toPath = path.join(outputDir, `${toPage}.mdx`);

  await mkdir(path.dirname(toPath), { recursive: true });
  await rm(toPath, { force: true });
  await rename(fromPath, toPath);
}

async function promoteRussianDefaultLanguage() {
  const config = JSON.parse(await readFile(outputConfigPath, 'utf8'));
  const languages = config.navigation?.languages;

  if (!Array.isArray(languages)) {
    return;
  }

  const zhLanguage = languages.find((item) => item.language === 'zh');
  const enLanguage = languages.find((item) => item.language === 'en');
  const ruLanguage = languages.find((item) => item.language === 'ru');

  if (!zhLanguage || !enLanguage || !ruLanguage) {
    throw new Error('LLMEasy navigation must include zh, en, and ru languages');
  }

  const zhPages = [...new Set(walkNavPages(zhLanguage))];
  const ruPages = [...new Set(walkNavPages(ruLanguage))];
  const defaultPages = ruPages.map((page) => {
    if (!page.startsWith('ru/')) {
      throw new Error(`Expected Russian page to use ru/ prefix: ${page}`);
    }

    return page.slice('ru/'.length);
  });
  const defaultPageSet = new Set(defaultPages);
  const zhPageSet = new Set(zhPages);

  for (const page of zhPages) {
    await movePage(page, `zh/${page}`);
  }

  for (let index = 0; index < ruPages.length; index += 1) {
    await movePage(ruPages[index], defaultPages[index]);
  }

  await rm(path.join(outputDir, 'ru'), { recursive: true, force: true });

  const remappedZh = remapNavPages(zhLanguage, (page) => `zh/${page}`);
  const remappedRu = remapNavPages(ruLanguage, (page) => page.replace(/^ru\//, ''));
  remappedRu.default = true;

  config.navigation.languages = [remappedRu, enLanguage, remappedZh];

  for (const page of zhPages) {
    await rewritePage(path.join(outputDir, `zh/${page}.mdx`), (route) => {
      if (zhPageSet.has(route)) {
        return `zh/${route}`;
      }

      return undefined;
    });
  }

  for (const page of defaultPages) {
    await rewritePage(path.join(outputDir, `${page}.mdx`), (route) => {
      if (route.startsWith('ru/') && defaultPageSet.has(route.slice('ru/'.length))) {
        return route.slice('ru/'.length);
      }

      return undefined;
    });
  }

  await writeFile(outputConfigPath, `${JSON.stringify(config, null, 2)}\n`);
}

async function generateLlmsFull() {
  const config = JSON.parse(await readFile(outputConfigPath, 'utf8'));
  const variables = config.variables ?? {};
  const pages = [...new Set(walkNavPages(config.navigation))];
  const sections = [`# ${config.name ?? 'LLMEasy'}`];

  if (config.description) {
    sections.push(`> ${config.description}`);
  }

  for (const page of pages) {
    const filePath = path.join(outputDir, `${page}.mdx`);
    const text = await readFile(filePath, 'utf8');
    const metadata = frontmatter(text);
    const title = resolveVariables(frontmatterValue(metadata, 'title') ?? page, variables);
    const description = resolveVariables(frontmatterValue(metadata, 'description') ?? '', variables);
    const content = normalizeMdxContent(text, variables);
    const sourceUrl = `${variables['site-url']}/${page}`;
    const pageParts = [`## ${title}`, `Source: ${sourceUrl}`];

    if (description) {
      pageParts.push(`Description: ${description}`);
    }

    if (content) {
      pageParts.push(content);
    }

    sections.push(pageParts.join('\n\n'));
  }

  if (config.api?.openapi) {
    const openApiPath = config.api.openapi;
    const openApiText = await readFile(path.join(outputDir, openApiPath), 'utf8');
    sections.push([
      '## OpenAPI specification',
      `Source: ${variables['site-url']}/${openApiPath}`,
      '```json',
      openApiText.trim(),
      '```',
    ].join('\n\n'));
  }

  const content = `${sections.join('\n\n---\n\n')}\n`;
  const wellKnownDir = path.join(outputDir, '.well-known');

  await mkdir(wellKnownDir, { recursive: true });
  await writeFile(path.join(outputDir, 'llms-full.txt'), content);
  await writeFile(path.join(wellKnownDir, 'llms-full.txt'), content);
}

async function generateIndexNowKeyFile() {
  await writeFile(path.join(outputDir, indexNowKeyFileName), `${indexNowKey}\n`);
}

async function renameRegionalPaths(dir) {
  const entries = await readdir(dir, { withFileTypes: true });

  for (const entry of entries) {
    const currentPath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      await renameRegionalPaths(currentPath);
    }

    if (entry.name.includes('bettertoken')) {
      const targetPath = path.join(dir, entry.name.replaceAll('bettertoken', 'llmeasy'));
      await rename(currentPath, targetPath);
    }
  }
}

await lstat(llmeasyConfigPath);
await rm(outputDir, { recursive: true, force: true });
await copyTree(rootDir, outputDir);
await copyFile(llmeasyConfigPath, outputConfigPath);
await rewriteRegionalBrand();
await renameRegionalPaths(outputDir);
await promoteRussianDefaultLanguage();
await generateLlmsFull();
await generateIndexNowKeyFile();

const relativeOutput = path.relative(rootDir, outputDir) || '.';
console.log(`Prepared LLMEasy docs deployment at ${relativeOutput}`);
console.log(`Next: cd ${relativeOutput} && mint broken-links && mint validate`);
