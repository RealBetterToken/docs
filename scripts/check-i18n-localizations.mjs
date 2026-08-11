#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { betterTokenLocales, newBetterTokenLocales } from './i18n-locales.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const config = JSON.parse(await readFile(path.join(rootDir, 'docs.json'), 'utf8'));
const localeFilter = process.argv.includes('--locale')
  ? process.argv[process.argv.indexOf('--locale') + 1]
  : undefined;
const fileFilter = process.argv.includes('--file')
  ? process.argv[process.argv.indexOf('--file') + 1]
  : undefined;

function collectNavPages(node, pages = []) {
  if (Array.isArray(node)) {
    for (const item of node) collectNavPages(item, pages);
  } else if (typeof node === 'string') {
    pages.push(node.replace(/^\//, ''));
  } else if (node && typeof node === 'object') {
    for (const key of ['tabs', 'groups', 'pages']) {
      if (key in node) collectNavPages(node[key], pages);
    }
  }
  return pages;
}

async function collectMdx(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectMdx(absolutePath));
    else if (entry.isFile() && entry.name.endsWith('.mdx')) files.push(absolutePath);
  }
  return files;
}

function frontmatter(text, filePath) {
  const block = text.match(/^---\n([\s\S]*?)\n---/);
  assert(block, `${filePath}: missing frontmatter`);
  const values = {};
  for (const line of block[1].split('\n')) {
    const match = line.match(/^(title|description):\s*["']?(.*?)["']?$/);
    if (match) values[match[1]] = match[2].trim();
  }
  return values;
}

function fencedCode(text) {
  return [...text.matchAll(/^[ \t]*```[^\n]*\n[\s\S]*?^[ \t]*```\s*$/gm)].map((match) => match[0]);
}

function withoutFencedCode(text) {
  return text.replace(/^[ \t]*```[^\n]*\n[\s\S]*?^[ \t]*```\s*$/gm, '');
}

function inlineCode(text) {
  return [...withoutFencedCode(text).matchAll(/(?<!`)`([^`\n]+)`(?!`)/g)].map((match) => match[1]);
}

function httpUrls(text) {
  return [...text.matchAll(/https?:\/\/[^\s)\]}>'"]+/g)].map((match) => match[0]);
}

function internalLinks(text) {
  const links = [];
  for (const match of text.matchAll(/\]\((\/[^)\s]+)\)/g)) links.push(match[1]);
  for (const match of text.matchAll(/href=(?:"|\{"|\{')([^"']+)(?:"|"\}|'\})/g)) {
    if (match[1].startsWith('/')) links.push(match[1]);
  }
  return links;
}

function numericTokens(text) {
  const prose = withoutFencedCode(text);
  const tokens = [
    ...[...prose.matchAll(/(?:US\s*)?[$€£¥]\s*\d+(?:[.,]\d+)*/g)]
      .map((match) => match[0].replace(/^US\s*/, '').replace(/\s+/g, '')),
    ...[...prose.matchAll(/\b[1-5]\d{2}\b/g)].map((match) => `http:${match[0]}`),
    ...[...prose.matchAll(/\b\d+(?:[.,]\d+)?%/g)].map((match) => match[0]),
    ...[...prose.matchAll(/=\{(\d+(?:\.\d+)?)\}/g)].map((match) => `jsx:${match[1]}`),
  ];
  return tokens.sort();
}

function metadataNumbers(metadata) {
  return [...`${metadata.title}\n${metadata.description}`.matchAll(/\d+(?:[.,]\d+)*/g)]
    .map((match) => match[0]);
}

function visibleEnglishLines(text) {
  const withoutMetadata = withoutFencedCode(text).replace(/^---\n[\s\S]*?\n---/, '');
  return withoutMetadata.split('\n')
    .filter((line) => !/^\s*(?:src|href|style|icon|cols)=/.test(line))
    .map((line) => line
    .replace(/`[^`]+`/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\]\([^)]+\)/g, ']')
    .replace(/<[^>]+>/g, ' ')
    .replace(/[|#>*_{}[\]()-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim())
    .filter((line) => line.length >= 32 && /[A-Za-z]{3}\s+[A-Za-z]{3}/.test(line));
}

const englishNavigation = config.navigation.languages.find(({ language }) => language === 'en');
assert(englishNavigation, 'docs.json: missing English navigation');
const englishRoutes = new Set(
  collectNavPages(englishNavigation).map((page) => page.slice('en/'.length)),
);
assert.equal(englishRoutes.size, 75, 'English navigation must contain 75 unique routes');

const englishFiles = await collectMdx(path.join(rootDir, 'en'));
const englishRelativeFiles = englishFiles.map((file) => path.relative(path.join(rootDir, 'en'), file)).sort();

const checkedLocales = newBetterTokenLocales.filter(
  ({ language, locale }) => !localeFilter || localeFilter === language || localeFilter === locale,
);
assert(checkedLocales.length > 0, `Unknown locale filter: ${localeFilter}`);

for (const locale of checkedLocales) {
  const languageNavigation = config.navigation.languages.find(
    ({ language }) => language === locale.language,
  );
  assert(languageNavigation, `docs.json: missing ${locale.language} navigation`);

  const localizedRoutes = new Set(
    collectNavPages(languageNavigation).map((page) => {
      assert(page.startsWith(locale.routePrefix), `${locale.locale}: invalid route ${page}`);
      return page.slice(locale.routePrefix.length);
    }),
  );
  assert.deepEqual(
    [...localizedRoutes].sort(),
    [...englishRoutes].sort(),
    `${locale.locale}: navigation routes must match English`,
  );

  const localizedDir = path.join(rootDir, locale.directory);
  const localizedFiles = (await collectMdx(localizedDir))
    .map((file) => path.relative(localizedDir, file))
    .sort();
  assert.deepEqual(
    localizedFiles,
    englishRelativeFiles,
    `${locale.locale}: MDX file structure must match English`,
  );

  const checkedFiles = englishRelativeFiles.filter(
    (relativePath) => !fileFilter || relativePath === fileFilter,
  );
  assert(checkedFiles.length > 0, `Unknown file filter: ${fileFilter}`);

  for (const relativePath of checkedFiles) {
    const sourcePath = path.join(rootDir, 'en', relativePath);
    const localizedPath = path.join(localizedDir, relativePath);
    const source = await readFile(sourcePath, 'utf8');
    const localized = await readFile(localizedPath, 'utf8');
    const sourceMeta = frontmatter(source, sourcePath);
    const localizedMeta = frontmatter(localized, localizedPath);

    assert(localizedMeta.title, `${localizedPath}: title must not be empty`);
    assert(localizedMeta.description, `${localizedPath}: description must not be empty`);
    assert.notEqual(localizedMeta.title, sourceMeta.title, `${localizedPath}: title is still English`);
    assert.notEqual(
      localizedMeta.description,
      sourceMeta.description,
      `${localizedPath}: description is still English`,
    );
    assert.deepEqual(
      metadataNumbers(localizedMeta),
      metadataNumbers(sourceMeta),
      `${localizedPath}: numeric values in SEO metadata differ from English source`,
    );
    assert.deepEqual(
      fencedCode(localized),
      fencedCode(source),
      `${localizedPath}: fenced code differs from English source`,
    );
    assert.deepEqual(
      inlineCode(localized),
      inlineCode(source),
      `${localizedPath}: inline code differs from English source`,
    );
    assert.deepEqual(
      httpUrls(localized),
      httpUrls(source),
      `${localizedPath}: external URLs differ from English source`,
    );
    assert.deepEqual(
      internalLinks(localized),
      internalLinks(source).map((link) => link.replace(/^\/en\//, `/${locale.routePrefix}`)),
      `${localizedPath}: internal links do not match localized routes`,
    );
    assert.deepEqual(
      numericTokens(localized),
      numericTokens(source),
      `${localizedPath}: numeric values differ from English source`,
    );

    const sourceLines = new Set(visibleEnglishLines(source));
    const residue = visibleEnglishLines(localized).filter((line) => sourceLines.has(line));
    assert.equal(
      residue.length,
      0,
      `${localizedPath}: untranslated English text remains:\n${residue.slice(0, 5).join('\n')}`,
    );
    assert.doesNotMatch(localized, /[А-Яа-яЁё]/, `${localizedPath}: Russian text is mixed in`);
    if (!['ja', 'ko'].includes(locale.language)) {
      assert.doesNotMatch(localized, /[\u3040-\u30ff\u3400-\u9fff]/, `${localizedPath}: CJK text is mixed in`);
    }
    if (locale.language !== 'ko') {
      assert.doesNotMatch(localized, /[\uac00-\ud7af]/, `${localizedPath}: Korean text is mixed in`);
    }
    if (locale.language !== 'hi') {
      assert.doesNotMatch(localized, /[\u0900-\u097f]/, `${localizedPath}: Hindi text is mixed in`);
    }
  }
}

assert.deepEqual(
  config.navigation.languages.map(({ language }) => language),
  betterTokenLocales.map(({ language }) => language),
  'docs.json language order must match the locale manifest',
);

console.log(`Localization checks passed for ${checkedLocales.length} languages.`);
