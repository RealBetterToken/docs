#!/usr/bin/env node

import assert from 'node:assert/strict';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newBetterTokenLocales } from './i18n-locales.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const englishDir = path.join(rootDir, 'en');

async function collectMdx(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolutePath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectMdx(absolutePath));
    else if (entry.isFile() && entry.name.endsWith('.mdx')) files.push(absolutePath);
  }
  return files;
}

async function exists(filePath) {
  try {
    await stat(filePath);
    return true;
  } catch (error) {
    if (error.code === 'ENOENT') return false;
    throw error;
  }
}

const sourceFiles = await collectMdx(englishDir);
assert(sourceFiles.length >= 75, `Expected at least 75 English MDX files, found ${sourceFiles.length}`);

let created = 0;
for (const locale of newBetterTokenLocales) {
  for (const sourcePath of sourceFiles) {
    const relativePath = path.relative(englishDir, sourcePath);
    const destinationPath = path.join(rootDir, locale.directory, relativePath);
    if (await exists(destinationPath)) continue;

    const source = await readFile(sourcePath, 'utf8');
    const localizedLinks = source.replaceAll('/en/', `/${locale.routePrefix}`);
    await mkdir(path.dirname(destinationPath), { recursive: true });
    await writeFile(destinationPath, localizedLinks);
    created += 1;
  }
}

console.log(`Created ${created} localized MDX scaffolds from ${sourceFiles.length} English files.`);
