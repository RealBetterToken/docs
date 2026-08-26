#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { betterTokenLocales, xDefaultLanguage } from './i18n-locales.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policy = JSON.parse(await readFile(path.join(rootDir, 'data/docs-locale-policy.json'), 'utf8'));
const expectedRussianMethods = ['Bank Card', 'SBP', 'Tinkoff Pay', 'Sber Pay', 'YooMoney'];
const expectedGlobalMethods = ['Stripe', 'USDT'];

assert.equal(policy.schemaVersion, 1, 'Unsupported Docs locale policy version');
assert.equal(policy.rootLanguage, 'ru', 'Russian must remain the root Docs language');
assert.equal(policy.xDefaultLanguage, xDefaultLanguage, 'Docs locale policy and sitemap x-default differ');
assert.equal(policy.languages.length, betterTokenLocales.length, 'Docs locale policy must cover every public language');

const policyByLanguage = new Map(policy.languages.map((entry) => [entry.language, entry]));
assert.equal(policyByLanguage.size, policy.languages.length, 'Docs locale policy contains duplicate languages');

for (const locale of betterTokenLocales) {
  const entry = policyByLanguage.get(locale.language);
  assert(entry, `Docs locale policy is missing ${locale.language}`);
  assert.equal(entry.locale, locale.locale, `${locale.language}: locale differs from the navigation manifest`);
  assert.equal(entry.routePrefix, locale.routePrefix, `${locale.language}: route prefix differs from the navigation manifest`);
  assert.equal(entry.indexPolicy, 'index', `${locale.language}: changing index policy requires an explicit SEO decision`);

  if (locale.language === 'ru') {
    assert.equal(entry.paymentCurrency, 'RUB', 'Russian payment currency must be RUB');
    assert.deepEqual(entry.paymentMethods, expectedRussianMethods, 'Russian payment methods are out of date');
  } else {
    assert.deepEqual(entry.paymentMethods, expectedGlobalMethods, `${locale.language}: global payment methods are out of date`);
  }
}

const homepages = new Map(
  await Promise.all(betterTokenLocales.map(async (locale) => {
    const relativePath = `${locale.routePrefix}index.mdx`;
    return [locale.language, await readFile(path.join(rootDir, relativePath), 'utf8')];
  })),
);

for (const method of expectedRussianMethods) {
  assert(homepages.get('ru').includes(method), `Russian homepage is missing payment method: ${method}`);
}

for (const locale of betterTokenLocales.filter(({ language }) => language !== 'ru')) {
  const homepage = homepages.get(locale.language);
  for (const method of expectedGlobalMethods) {
    assert(homepage.includes(method), `${locale.language} homepage is missing payment method: ${method}`);
  }
}

for (const phrase of ['users, teams, and developers in Russia', 'ruble payments', 'no VPN', 'Service region: Russia']) {
  assert(!homepages.get('en').includes(phrase), `English homepage retains Russia-only positioning: ${phrase}`);
}

for (const phrase of ['面向俄罗斯', '支持卢布支付', '无需 VPN', '服务区域：俄罗斯']) {
  assert(!homepages.get('zh').includes(phrase), `Chinese homepage retains Russia-only positioning: ${phrase}`);
}

const localeManifest = await readFile(path.join(rootDir, 'scripts/i18n-locales.mjs'), 'utf8');
assert(!/navbarLabel:.*(?:\$1|US\$ 1|1 \$)/.test(localeManifest), 'Navigation CTA still promises trial credit');

console.log('Docs market and language policy checks passed.');
