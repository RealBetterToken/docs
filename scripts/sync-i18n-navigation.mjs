#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { newBetterTokenLocales } from './i18n-locales.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const configPath = path.join(rootDir, 'docs.json');
const checkOnly = process.argv.includes('--check');
const legacyRoutes = [
  ['faq/claude-desktop-cowork-code-gateway', 'faq/claude-desktop/cowork-code-gateway'],
  ['faq/claude-desktop-third-party-models', 'faq/claude-desktop/third-party-models'],
  ['faq/codex-official-login-third-party-api', 'faq/codex/official-login-third-party-api'],
];

function localizeNavigation(value, locale) {
  if (Array.isArray(value)) return value.map((item) => localizeNavigation(item, locale));
  if (!value || typeof value !== 'object') return value;

  const localized = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'language') {
      localized.language = locale.language;
    } else if (key === 'default') {
      continue;
    } else if (key === 'label' && value.type === 'button') {
      localized.label = locale.navbarLabel;
    } else if ((key === 'tab' || key === 'group') && typeof item === 'string') {
      assert(locale.labels[item], `${locale.locale}: missing navigation label for ${item}`);
      localized[key] = locale.labels[item];
    } else if (key === 'pages') {
      localized.pages = item.map((page) => {
        assert(page.startsWith('en/'), `English navigation path must start with en/: ${page}`);
        return `${locale.routePrefix}${page.slice('en/'.length)}`;
      });
    } else {
      localized[key] = localizeNavigation(item, locale);
    }
  }
  return localized;
}

function expectedConfig(config) {
  const english = config.navigation.languages.find(({ language }) => language === 'en');
  assert(english, 'docs.json is missing English navigation');

  const addedLanguages = new Set(newBetterTokenLocales.map(({ language }) => language));
  const existingLanguages = config.navigation.languages.filter(
    ({ language }) => !addedLanguages.has(language),
  );
  config.navigation.languages = [
    ...existingLanguages,
    ...newBetterTokenLocales.map((locale) => localizeNavigation(english, locale)),
  ];

  const redirects = new Map(config.redirects.map((redirect) => [redirect.source, redirect]));
  for (const locale of newBetterTokenLocales) {
    for (const [oldRoute, newRoute] of legacyRoutes) {
      const source = `/${locale.routePrefix}${oldRoute}`;
      redirects.set(source, {
        source,
        destination: `/${locale.routePrefix}${newRoute}`,
        permanent: true,
      });
    }
  }
  config.redirects = [...redirects.values()];
  return config;
}

const original = await readFile(configPath, 'utf8');
const expected = `${JSON.stringify(expectedConfig(JSON.parse(original)), null, 2)}\n`;

if (checkOnly) {
  assert.equal(original, expected, 'docs.json localized navigation is out of date');
  console.log('Localized navigation is up to date.');
} else {
  await writeFile(configPath, expected);
  console.log('Synchronized localized navigation in docs.json.');
}
