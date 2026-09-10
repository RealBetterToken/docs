#!/usr/bin/env node

import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const siteUrl = 'https://docs.bettertoken.ai';

function sha256(value) {
  return `sha256:${createHash('sha256').update(value).digest('hex')}`;
}

function localeForRoute(route) {
  if (route.startsWith('en/')) return 'en';
  if (route.startsWith('zh/')) return 'zh-CN';
  if (route.startsWith('pt-br/')) return 'pt-BR';
  if (/^(de|es|fr|hi|ja|ko)\//.test(route)) return route.slice(0, 2);
  return 'ru';
}

export function receiptForVerifiedPages({ sourceRevision, releaseId, pages, verifiedAt, evidence }) {
  const material = ['docs', releaseId, ...pages.map((page) => page.url)].join('\0');
  return {
    schema_version: 'seo-page-change-v1',
    event_id: `docs-${createHash('sha256').update(material).digest('hex')}`,
    producer: 'docs',
    release_id: releaseId,
    source_revision: sourceRevision || null,
    observed_at: verifiedAt,
    deployed_at: null,
    verified_at: verifiedAt,
    verification: 'verified',
    pages,
    evidence,
  };
}

function visibleExcerpt(sourceText) {
  const body = sourceText.replace(/^---[\s\S]*?---\s*/, '').replace(/^import .*$/gm, '');
  return body.split(/\n+/).map((line) => line.replace(/<[^>]+>/g, '').replace(/^[#>*\-\d.\s]+/, '').trim()).find((line) => line.length >= 20) || '';
}

function normalizeChangedLine(line) {
  return line.slice(1).replace(/<[^>]+>/g, '').replace(/[`*_~]/g, '')
    .replace(/^[#>*\-\d.\s]+/, '').trim();
}

export function changedVisibleChanges(diff) {
  const changes = { added: [], removed: [] };
  for (const line of diff.split('\n')) {
    if (!/^[+-](?![+-])/.test(line)) continue;
    const visible = normalizeChangedLine(line);
    if (visible.length < 20) continue;
    changes[line[0] === '+' ? 'added' : 'removed'].push(visible);
  }
  return changes;
}

function gitDiff(sourceRevision, sourceFile) {
  return new Promise((resolve) => execFile('git', ['diff', `${sourceRevision}^`, sourceRevision, '--', sourceFile], { cwd: rootDir }, (error, stdout) => resolve(error ? null : stdout)));
}

export async function fetchPage(url, expectedTitle, expectedExcerpt, changes, fetchImpl = fetch) {
  const response = await fetchImpl(url, { redirect: 'manual', headers: { accept: 'text/html' } });
  if (response.status !== 200 || response.headers.get('location')) {
    throw new Error(`live page verification failed: ${url} HTTP ${response.status}`);
  }
  const html = await response.text();
  if (!/<title>[^<\s][\s\S]*?<\/title>/i.test(html) || !/<link[^>]+rel="canonical"/i.test(html)) {
    throw new Error(`live page verification failed: ${url} lacks title or canonical`);
  }
  const actualTitle = html.match(/<title>([^<]+)<\/title>/i)?.[1]?.trim();
  if (!expectedTitle || !actualTitle || !(actualTitle === expectedTitle || actualTitle.startsWith(`${expectedTitle} |`) || actualTitle.endsWith(`| ${expectedTitle}`))) {
    throw new Error(`live page verification failed: ${url} title does not match the checked-out source`);
  }
  if (!expectedExcerpt || !html.includes(expectedExcerpt)) {
    throw new Error(`live page verification failed: ${url} does not contain checked-out body excerpt`);
  }
  for (const line of changes.added) if (!html.includes(line)) throw new Error(`live page verification failed: ${url} lacks changed source text`);
  for (const line of changes.removed) if (!changes.currentSource.includes(line) && html.includes(line)) throw new Error(`live page verification failed: ${url} still contains removed source text`);
  return sha256(html);
}

export async function buildReceipt({ sourceRevision, releaseId, routes, fetchPageImpl = fetchPage, readSource = readFile, diffImpl = gitDiff }) {
  const verifiedAt = new Date().toISOString();
  const pages = [];
  const unsupported = [];
  for (const route of routes) {
    const cleanRoute = String(route).replace(/^\//, '').replace(/\.mdx$/, '');
    const pathname = cleanRoute === 'index' ? '' : `/${cleanRoute.replace(/\/index$/, '')}`;
    const url = `${siteUrl}${pathname}`;
    const sourceFile = `${cleanRoute || 'index'}.mdx`;
    let sourceText;
    try { sourceText = await readSource(path.join(rootDir, sourceFile), 'utf8'); }
    catch { sourceText = null; }
    if (!sourceText) {
      unsupported.push({ url, locale: localeForRoute(cleanRoute), cleanRoute });
      pages.push({ url, locale: localeForRoute(cleanRoute), change_type: 'unknown', summary: `Docs route cannot map to checked-out source: ${cleanRoute || 'index'}`, source_files: [sourceFile], before_fingerprint: null, after_fingerprint: null });
      continue;
    }
    const expectedTitle = sourceText.match(/^title:\s*["']?(.+?)["']?\s*$/m)?.[1]?.trim();
    const expectedExcerpt = visibleExcerpt(sourceText);
    const diff = sourceRevision ? await diffImpl(sourceRevision, sourceFile) : null;
    const visibleChanges = diff === null ? { added: [], removed: [] } : changedVisibleChanges(diff);
    const changes = { ...visibleChanges, currentSource: sourceText };
    if (!expectedTitle || !expectedExcerpt || !diff || (!changes.added.length && !changes.removed.length)) unsupported.push({ url, locale: localeForRoute(cleanRoute), cleanRoute });
    pages.push({
      url,
      locale: localeForRoute(cleanRoute),
      change_type: 'content',
      summary: `Docs page verified after Mintlify deployment: ${cleanRoute || 'index'}`,
      source_files: [`${cleanRoute || 'index'}.mdx`],
      before_fingerprint: null,
      after_fingerprint: expectedTitle && expectedExcerpt && diff && (changes.added.length || changes.removed.length) ? await fetchPageImpl(url, expectedTitle, expectedExcerpt, changes) : null,
    });
  }
  if (unsupported.length) {
    return {
      ...receiptForVerifiedPages({ sourceRevision, releaseId, pages: pages.map((page) => ({ ...page, after_fingerprint: null })), verifiedAt, evidence: { fingerprint_algorithm: 'sha256:raw-html-v1', verification: 'source body marker unavailable' } }),
      verification: 'pending', verified_at: null,
    };
  }
  return receiptForVerifiedPages({
    sourceRevision,
    releaseId,
    pages,
    verifiedAt,
    evidence: { mintlify_check: `GitHub check for ${sourceRevision}`, page_verification: 'live HTTP 200, canonical, and title matching checked-out MDX', fingerprint_algorithm: 'sha256:raw-html-v1' },
  });
}

export async function writeReceipt(output, receipt) {
  await mkdir(path.dirname(output), { recursive: true });
  await writeFile(output, `${JSON.stringify(receipt, null, 2)}\n`, 'utf8');
}

function parseArgs(args) {
  const values = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    if (!['--output', '--source-revision', '--release-id', '--route'].includes(key)) throw new Error(`unknown argument: ${key}`);
    const value = args[++index];
    if (!value) throw new Error(`${key} requires a value`);
    if (key === '--route') (values.routes ??= []).push(value);
    else values[key.slice(2).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
  }
  return values;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = parseArgs(process.argv.slice(2));
  if (!options.output || !options.releaseId || !options.sourceRevision || !options.routes?.length) {
    throw new Error('--output, --release-id, --source-revision, and at least one --route are required');
  }
  writeReceipt(options.output, await buildReceipt(options));
}
