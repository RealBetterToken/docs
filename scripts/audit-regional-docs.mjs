#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceConfig = readJson('docs.json');
const regionalConfig = readJson('docs.llmeasy.json');
const generatedConfigPath = path.join(rootDir, '.mintlify-llmeasy', 'docs.json');
const generatedConfig = fs.existsSync(generatedConfigPath)
  ? JSON.parse(fs.readFileSync(generatedConfigPath, 'utf8'))
  : undefined;

const errors = [];
const warnings = [];
const sourceExpectedVariables = {
  'brand-name': 'BetterToken',
  'site-url': 'https://docs.bettertoken.ai',
  'anthropic-base-url': 'https://www.bettertoken.ai',
  'openai-base-url': 'https://www.bettertoken.ai/v1',
  'chat-completions-url': 'https://www.bettertoken.ai/v1/chat/completions',
  'images-generations-url': 'https://www.bettertoken.ai/v1/images/generations',
  'images-edits-url': 'https://www.bettertoken.ai/v1/images/edits',
  'register-url': 'https://www.bettertoken.ai/register',
  'pricing-url': 'https://www.bettertoken.ai/#',
  'model-plaza-url': 'https://www.bettertoken.ai/pricing',
  'privacy-url': 'https://www.bettertoken.ai/privacy',
  'install-codex-provider-sh-url': 'https://www.bettertoken.ai/install-codex-provider.sh',
  'install-codex-provider-ps1-url': 'https://www.bettertoken.ai/install-codex-provider.ps1',
  'install-openclaw-provider-sh-url': 'https://www.bettertoken.ai/install-openclaw-provider.sh',
  'install-openclaw-provider-ps1-url': 'https://www.bettertoken.ai/install-openclaw-provider.ps1',
  'install-opencode-provider-sh-url': 'https://www.bettertoken.ai/install-opencode-provider.sh',
  'install-opencode-provider-ps1-url': 'https://www.bettertoken.ai/install-opencode-provider.ps1',
};
const regionalExpectedVariables = Object.fromEntries(
  Object.entries(sourceExpectedVariables).map(([key, value]) => [
    key,
    value
      .replace('https://docs.bettertoken.ai', 'https://www.llmeasy.ru')
      .replace('https://www.bettertoken.ai', 'https://www.llmeasy.ru'),
  ]),
);
regionalExpectedVariables['brand-name'] = 'LLMEasy';

function readJson(file) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, file), 'utf8'));
}

function walkNav(node, out = []) {
  if (!node) {
    return out;
  }

  if (Array.isArray(node)) {
    for (const item of node) {
      walkNav(item, out);
    }
    return out;
  }

  if (typeof node === 'string') {
    out.push(node);
    return out;
  }

  if (typeof node === 'object') {
    if (typeof node.href === 'string' && !/^https?:\/\//.test(node.href)) {
      out.push(node.href);
    }

    for (const key of ['languages', 'tabs', 'groups', 'pages', 'anchors', 'dropdowns', 'versions']) {
      walkNav(node[key], out);
    }
  }

  return out;
}

function pagesForLanguage(config, language) {
  const lang = config.navigation?.languages?.find((item) => item.language === language);
  return walkNav(lang).filter(Boolean);
}

function frontmatter(text) {
  return text.match(/^---\n([\s\S]*?)\n---/)?.[1] ?? '';
}

function headings(text) {
  return [...text.matchAll(/^(#{1,6})\s+(.+)$/gm)].map((match) => `${match[1].length}:${match[2].trim()}`);
}

function codeBlocks(text) {
  return [...text.matchAll(/^```([^\n]*)/gm)].map((match) => match[1].trim());
}

function internalLinks(text) {
  return [...text.matchAll(/\[[^\]]+\]\(([^)]+)\)/g)]
    .map((match) => match[1])
    .filter((href) => !href.startsWith('http') && !href.startsWith('{{'));
}

function variables(text) {
  return [...text.matchAll(/\{\{([a-z0-9-]+)\}\}/gi)].map((match) => match[1]).sort();
}

function mdxFiles(dir, files = []) {
  if (!fs.existsSync(dir)) {
    return files;
  }

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const filePath = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      mdxFiles(filePath, files);
    } else if (entry.isFile() && entry.name.endsWith('.mdx')) {
      files.push(filePath);
    }
  }

  return files;
}

function checkFileExists(page, label) {
  const filePath = path.join(rootDir, `${page}.mdx`);
  if (!fs.existsSync(filePath)) {
    errors.push(`${label}: missing page file ${page}.mdx`);
  }
}

function checkNoUnlistedPages() {
  const listed = new Set(walkNav(sourceConfig.navigation).map((page) => `${page}.mdx`));
  const allPages = mdxFiles(rootDir)
    .filter((filePath) => !filePath.includes(`${path.sep}.mintlify-llmeasy${path.sep}`))
    .map((filePath) => path.relative(rootDir, filePath).split(path.sep).join('/'))
    .sort();

  for (const page of allPages) {
    if (!listed.has(page)) {
      errors.push(`${page}: MDX page is not listed in docs.json navigation`);
    }
  }
}

function checkVariableDefinitions(config, label, files) {
  const defined = new Set(Object.keys(config.variables ?? {}));

  for (const filePath of files) {
    const text = fs.readFileSync(filePath, 'utf8');

    for (const variable of variables(text)) {
      if (!defined.has(variable)) {
        errors.push(`${label}: ${path.relative(rootDir, filePath)} references missing variable {{${variable}}}`);
      }
    }
  }
}

function checkConfig(config, label, expected) {
  if (config.name !== expected.name) {
    errors.push(`${label}: expected name ${expected.name}, found ${config.name}`);
  }

  for (const [key, value] of Object.entries(expected.variables)) {
    if (config.variables?.[key] !== value) {
      errors.push(`${label}: expected variable ${key}=${value}, found ${config.variables?.[key]}`);
    }
  }

  if (expected.openapi && config.api?.openapi !== expected.openapi) {
    errors.push(`${label}: expected api.openapi ${expected.openapi}, found ${config.api?.openapi}`);
  }
}

function checkConfigAssets(config, label, baseDir = rootDir) {
  const assetPaths = [];

  if (typeof config.favicon === 'string') {
    assetPaths.push(config.favicon);
  }

  if (typeof config.logo === 'string') {
    assetPaths.push(config.logo);
  } else if (config.logo && typeof config.logo === 'object') {
    for (const logoPath of [config.logo.light, config.logo.dark]) {
      if (typeof logoPath === 'string') {
        assetPaths.push(logoPath);
      }
    }
  }

  for (const assetPath of assetPaths) {
    if (!assetPath.startsWith('/')) {
      continue;
    }

    const filePath = path.join(baseDir, assetPath.slice(1));
    if (!fs.existsSync(filePath)) {
      errors.push(`${label}: missing referenced asset ${assetPath}`);
    }
  }
}

function checkConfigDomainIsolation(config, label, forbiddenDomains) {
  const text = JSON.stringify(config);

  for (const domain of forbiddenDomains) {
    if (text.includes(domain)) {
      errors.push(`${label}: contains forbidden domain ${domain}`);
    }
  }
}

function checkLanguageCoverage() {
  const zhPages = pagesForLanguage(sourceConfig, 'zh');
  const enPages = pagesForLanguage(sourceConfig, 'en');
  const ruPages = pagesForLanguage(sourceConfig, 'ru');
  const ruSet = new Set(ruPages);

  if (zhPages.length !== enPages.length || enPages.length !== ruPages.length) {
    errors.push(`navigation page count mismatch zh=${zhPages.length}, en=${enPages.length}, ru=${ruPages.length}`);
  }

  for (const page of [...zhPages, ...enPages, ...ruPages]) {
    checkFileExists(page, 'docs.json');
  }

  for (const enPage of enPages) {
    const ruPage = enPage.replace(/^en\//, 'ru/');

    if (!ruSet.has(ruPage)) {
      errors.push(`ru navigation missing counterpart for ${enPage}: ${ruPage}`);
      continue;
    }

    const enText = fs.readFileSync(path.join(rootDir, `${enPage}.mdx`), 'utf8');
    const ruText = fs.readFileSync(path.join(rootDir, `${ruPage}.mdx`), 'utf8');
    const fm = frontmatter(ruText);

    if (!/title:\s*"?[^"\n]+"?/m.test(fm)) {
      errors.push(`${ruPage}: missing title frontmatter`);
    }

    if (!/description:\s*"?[^"\n]+"?/m.test(fm)) {
      errors.push(`${ruPage}: missing description frontmatter`);
    }

    const enHeadings = headings(enText);
    const ruHeadings = headings(ruText);
    if (Math.abs(enHeadings.length - ruHeadings.length) > 2) {
      warnings.push(`${ruPage}: heading count differs ru=${ruHeadings.length}, en=${enHeadings.length}`);
    }

    const enCodeBlocks = codeBlocks(enText);
    const ruCodeBlocks = codeBlocks(ruText);
    if (enCodeBlocks.length !== ruCodeBlocks.length) {
      warnings.push(`${ruPage}: code block count differs ru=${ruCodeBlocks.length}, en=${enCodeBlocks.length}`);
    }

    const enInternalLinks = internalLinks(enText);
    const ruInternalLinks = internalLinks(ruText);
    if (Math.abs(enInternalLinks.length - ruInternalLinks.length) > 2) {
      warnings.push(`${ruPage}: internal link count differs ru=${ruInternalLinks.length}, en=${enInternalLinks.length}`);
    }

    const enVariables = variables(enText).join(',');
    const ruVariables = variables(ruText).join(',');
    if (enVariables !== ruVariables) {
      warnings.push(`${ruPage}: variable refs differ ru=[${ruVariables}] en=[${enVariables}]`);
    }
  }
}

function checkGeneratedRegionalOutput() {
  if (!generatedConfig) {
    errors.push('missing .mintlify-llmeasy/docs.json; run node scripts/prepare-llmeasy-deployment.mjs first');
    return;
  }

  checkConfig(generatedConfig, '.mintlify-llmeasy/docs.json', {
    name: 'LLMEasy',
    openapi: 'api-reference/openapi.llmeasy.json',
    variables: regionalExpectedVariables,
  });

  const generatedRoot = path.join(rootDir, '.mintlify-llmeasy');
  checkConfigAssets(generatedConfig, '.mintlify-llmeasy/docs.json', generatedRoot);
  const forbiddenGeneratedPaths = new Set([
    'CONTRIBUTING.md',
    'LICENSE',
    'api-reference/endpoint',
    'development.mdx',
    'downloads',
    'essentials',
    'favicon.svg',
    'images/checks-passed.png',
    'images/hero-dark.png',
    'images/hero-light.png',
    'images/temp',
    'logo/dark.svg',
    'logo/light.svg',
    'skills-lock.json',
    'skills',
    'snippets',
  ]);
  const textFiles = [];
  const allowedExtensions = new Set(['.md', '.mdx', '.json', '.yml', '.yaml']);

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const filePath = path.join(dir, entry.name);
      const relativePath = path.relative(generatedRoot, filePath).split(path.sep).join('/');

      if (forbiddenGeneratedPaths.has(relativePath)) {
        errors.push(`.mintlify-llmeasy/${relativePath}: should not be included in generated regional output`);
      }

      if (entry.isDirectory()) {
        walk(filePath);
      } else if (entry.isFile() && allowedExtensions.has(path.extname(entry.name))) {
        textFiles.push(filePath);
      }
    }
  }

  walk(generatedRoot);

  const generatedNavPages = new Set(walkNav(generatedConfig.navigation).map((page) => `${page}.mdx`));
  const generatedMdxPages = mdxFiles(generatedRoot)
    .map((filePath) => path.relative(generatedRoot, filePath).split(path.sep).join('/'))
    .sort();

  for (const page of generatedMdxPages) {
    if (!generatedNavPages.has(page)) {
      errors.push(`.mintlify-llmeasy/${page}: generated MDX page is not listed in generated docs.json navigation`);
    }
  }

  for (const page of generatedNavPages) {
    if (!fs.existsSync(path.join(generatedRoot, page))) {
      errors.push(`.mintlify-llmeasy/docs.json: navigation references missing generated page ${page}`);
    }
  }

  for (const llmsFullRelativePath of ['llms-full.txt', '.well-known/llms-full.txt']) {
    const llmsFullPath = path.join(generatedRoot, llmsFullRelativePath);
    if (!fs.existsSync(llmsFullPath)) {
      errors.push(`.mintlify-llmeasy/${llmsFullRelativePath}: missing generated custom llms-full file`);
      continue;
    }

    const llmsFullText = fs.readFileSync(llmsFullPath, 'utf8');

    if (!llmsFullText.startsWith('# LLMEasy')) {
      errors.push(`.mintlify-llmeasy/${llmsFullRelativePath}: expected # LLMEasy heading`);
    }

    if (/BetterToken|bettertoken|BETTERTOKEN|https:\/\/www\.bettertoken\.ai|https:\/\/docs\.bettertoken\.ai|bettertoken\.mintlify\.app/.test(llmsFullText)) {
      errors.push(`.mintlify-llmeasy/${llmsFullRelativePath}: contains BetterToken brand text, production domain, or starter cache URL`);
    }
  }

  for (const filePath of textFiles) {
    const text = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(rootDir, filePath);
    const generatedRelativePath = path.relative(generatedRoot, filePath).split(path.sep).join('/');

    if (/bettertoken/.test(relativePath)) {
      errors.push(`${relativePath}: contains bettertoken in generated path`);
    }

    if (/https:\/\/www\.bettertoken\.ai|https:\/\/docs\.bettertoken\.ai/.test(text)) {
      errors.push(`${relativePath}: contains BetterToken production domain`);
    }

    if (/BetterToken|bettertoken|BETTERTOKEN/.test(text)) {
      errors.push(`${relativePath}: contains BetterToken brand text`);
    }

    const assetReferences = [
      ...text.matchAll(/src="(\/images\/[^"]+)"/g),
      ...text.matchAll(/!\[[^\]]*\]\((\/images\/[^)]+)\)/g),
    ].map((match) => match[1].split(/[?#]/)[0]);

    for (const assetReference of assetReferences) {
      const assetPath = path.join(generatedRoot, assetReference.slice(1));
      if (!fs.existsSync(assetPath)) {
        errors.push(`.mintlify-llmeasy/${generatedRelativePath}: missing referenced asset ${assetReference}`);
      }
    }
  }
}

function checkRegionalOpenApiSource() {
  const filePath = path.join(rootDir, 'api-reference/openapi.llmeasy.json');
  const text = fs.readFileSync(filePath, 'utf8');

  if (/[\u4e00-\u9fff]/.test(text)) {
    errors.push('api-reference/openapi.llmeasy.json: contains Chinese text');
  }

  if (/BetterToken|bettertoken|BETTERTOKEN|https:\/\/www\.bettertoken\.ai|https:\/\/docs\.bettertoken\.ai/.test(text)) {
    errors.push('api-reference/openapi.llmeasy.json: contains BetterToken brand text or production domain');
  }
}

function checkRussianPages() {
  const checks = [
    {
      root: path.join(rootDir, 'ru'),
      label: 'ru',
    },
    {
      root: path.join(rootDir, '.mintlify-llmeasy', 'ru'),
      label: '.mintlify-llmeasy/ru',
    },
  ];

  for (const check of checks) {
    for (const filePath of mdxFiles(check.root)) {
      const text = fs.readFileSync(filePath, 'utf8');
      const relativePath = path.relative(rootDir, filePath).split(path.sep).join('/');

      if (/[\u4e00-\u9fff]/.test(text)) {
        errors.push(`${relativePath}: Russian page contains Chinese text`);
      }

      if (/https:\/\/www\.bettertoken\.ai|https:\/\/docs\.bettertoken\.ai/.test(text)) {
        errors.push(`${relativePath}: Russian page contains BetterToken production domain`);
      }
    }
  }
}

function checkNoHardcodedProductionDomainsInMdx() {
  const files = mdxFiles(rootDir).filter((filePath) => !filePath.includes(`${path.sep}.mintlify-llmeasy${path.sep}`));
  const forbiddenDomains = [
    'https://www.bettertoken.ai',
    'https://docs.bettertoken.ai',
    'https://www.llmeasy.ru',
  ];

  for (const filePath of files) {
    const text = fs.readFileSync(filePath, 'utf8');
    const relativePath = path.relative(rootDir, filePath).split(path.sep).join('/');

    for (const domain of forbiddenDomains) {
      if (text.includes(domain)) {
        errors.push(`${relativePath}: hardcodes ${domain}; use a Mintlify variable instead`);
      }
    }
  }
}

checkConfig(sourceConfig, 'docs.json', {
  name: 'BetterToken',
  openapi: 'api-reference/openapi.json',
  variables: sourceExpectedVariables,
});
checkConfigAssets(sourceConfig, 'docs.json');
checkConfigDomainIsolation(sourceConfig, 'docs.json', ['https://www.llmeasy.ru']);

checkConfig(regionalConfig, 'docs.llmeasy.json', {
  name: 'LLMEasy',
  openapi: 'api-reference/openapi.llmeasy.json',
  variables: regionalExpectedVariables,
});
checkConfigAssets(regionalConfig, 'docs.llmeasy.json');
checkConfigDomainIsolation(regionalConfig, 'docs.llmeasy.json', [
  'https://www.bettertoken.ai',
  'https://docs.bettertoken.ai',
]);

checkLanguageCoverage();
checkNoUnlistedPages();
checkRegionalOpenApiSource();
checkRussianPages();
checkNoHardcodedProductionDomainsInMdx();
checkVariableDefinitions(sourceConfig, 'docs.json', [
  ...mdxFiles(rootDir).filter((filePath) => !filePath.includes(`${path.sep}.mintlify-llmeasy${path.sep}`)),
]);
checkGeneratedRegionalOutput();

if (warnings.length) {
  console.log('Warnings:');
  console.log(warnings.join('\n'));
}

if (errors.length) {
  console.error('Errors:');
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log('Regional docs audit passed.');
