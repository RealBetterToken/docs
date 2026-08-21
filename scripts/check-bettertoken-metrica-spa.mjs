#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(path.join(rootDir, 'scripts', 'llmeasy-metrica-spa.js.template'), 'utf8');
const docsConfig = JSON.parse(await readFile(path.join(rootDir, 'docs.json'), 'utf8'));

assert.equal(
  docsConfig.integrations?.gtm?.tagId,
  'GTM-KXQ798MR',
  'GTM must be injected through the native Mintlify integration'
);
assert.doesNotMatch(source, /googletagmanager\.com|GTM-KXQ798MR|gtm\.js/);

function createHarness(initialUrl) {
  const listeners = new Map();
  const clarityCalls = [];
  const metricaCalls = [];
  const maskedAttributes = new Map();
  const playground = {
    matches(selector) {
      return selector === '[id^="api-playground-"]';
    },
    querySelectorAll() {
      return [];
    },
    setAttribute(name, value) {
      maskedAttributes.set(name, value);
    },
  };
  let currentUrl = new URL(initialUrl);
  let currentPath = currentUrl.pathname;

  const location = {
    get href() {
      return currentUrl.href;
    },
    get hostname() {
      return currentUrl.hostname;
    },
    get origin() {
      return currentUrl.origin;
    },
    get pathname() {
      return currentUrl.pathname;
    },
    get search() {
      return currentUrl.search;
    },
  };

  const documentElement = {
    getAttribute(name) {
      return name === 'data-current-path' ? currentPath : null;
    },
    matches() {
      return false;
    },
    querySelectorAll(selector) {
      return selector === '[id^="api-playground-"]' ? [playground] : [];
    },
  };

  const document = {
    title: 'Quickstart | BetterToken',
    documentElement,
    addEventListener(name, callback) {
      listeners.set(name, callback);
    },
  };

  const history = {
    pushState(_state, _unused, url) {
      currentUrl = new URL(url, currentUrl);
      currentPath = currentUrl.pathname;
    },
    replaceState(_state, _unused, url) {
      currentUrl = new URL(url, currentUrl);
      currentPath = currentUrl.pathname;
    },
  };

  class MutationObserver {
    constructor(callback) {
      this.callback = callback;
    }

    observe() {}
  }

  const window = {
    MutationObserver,
    clarity(...args) {
      clarityCalls.push(structuredClone(args));
    },
    document,
    history,
    location,
    addEventListener(name, callback) {
      listeners.set(name, callback);
    },
    requestAnimationFrame(callback) {
      queueMicrotask(() => callback(Date.now()));
    },
    setTimeout,
    ym(...args) {
      metricaCalls.push(structuredClone(args));
    },
  };

  const context = {
    Date,
    URL,
    console,
    document,
    window,
  };

  return {
    clarityCalls,
    context,
    document,
    history,
    listeners,
    maskedAttributes,
    metricaCalls,
    window,
  };
}

function clickTarget({ href, copy = false }) {
  const anchor = href ? { href } : null;
  const copyButton = copy ? {} : null;

  return {
    closest(selector) {
      if (selector === 'a[href]') return anchor;
      if (selector === 'button[data-testid="copy-code-button"]') return copyButton;
      return null;
    },
  };
}

function ga4Events(dataLayer) {
  return dataLayer
    .filter((entry) => typeof entry?.[0] === 'string' && entry[0] === 'event')
    .map((entry) => JSON.parse(JSON.stringify(Array.from(entry))));
}

const blockedUrls = [
  'http://localhost:3000/en/quickstart',
  'http://127.0.0.1:3000/en/quickstart',
  'https://bettertoken-d796114e.mintlify.app/en/quickstart',
  'https://deployment-preview.mintlify.app/en/quickstart',
];

for (const blockedUrl of blockedUrls) {
  const preview = createHarness(blockedUrl);
  vm.runInNewContext(source, preview.context);

  assert.equal(preview.listeners.size, 0, `${blockedUrl} must not install analytics listeners`);
  assert.equal(preview.window.dataLayer, undefined, `${blockedUrl} must not create an analytics queue`);
}

const production = createHarness('https://docs.bettertoken.ai/en/quickstart?api_key=secret');
vm.runInNewContext(source, production.context);
vm.runInNewContext(source, production.context);

assert.equal(
  production.maskedAttributes.get('data-clarity-mask'),
  'true',
  'API Playground must be masked for Clarity'
);
assert.deepEqual(
  production.clarityCalls,
  [['set', 'site_surface', 'docs']],
  'Clarity site surface must be set once'
);
assert.equal(
  production.metricaCalls.length,
  0,
  'initial load must rely on the automatic Metrica page view'
);

production.history.pushState({}, '', '/en/ai-tools/codex?api_key=secret');
assert.equal(production.metricaCalls.length, 0, 'route hit must wait for the new title');
production.document.title = 'Codex | BetterToken';
await new Promise((resolve) => setTimeout(resolve, 80));

assert.deepEqual(production.metricaCalls, [[
  110565477,
  'hit',
  'https://docs.bettertoken.ai/en/ai-tools/codex',
  { title: 'Codex | BetterToken' },
]]);

const click = production.listeners.get('click');
click({ target: clickTarget({ href: 'https://bettertoken.ai/register?email=private@example.com' }) });
click({ target: clickTarget({ copy: true }) });

assert.deepEqual(production.clarityCalls, [
  ['set', 'site_surface', 'docs'],
  ['event', 'docs_to_register'],
  ['event', 'docs_code_copied'],
]);
assert.deepEqual(production.metricaCalls.slice(1), [
  [110565477, 'reachGoal', 'docs_to_register'],
  [110565477, 'reachGoal', 'docs_code_copied'],
]);
assert.equal(
  JSON.stringify(ga4Events(production.window.dataLayer)),
  JSON.stringify([
    ['event', 'docs_to_register', { event_category: 'docs', site_surface: 'docs' }],
    ['event', 'docs_code_copied', { event_category: 'docs', site_surface: 'docs' }],
  ])
);

const serializedEvents = JSON.stringify({
  clarity: production.clarityCalls.slice(1),
  ga4: ga4Events(production.window.dataLayer),
  metrica: production.metricaCalls.slice(1),
});

assert.doesNotMatch(serializedEvents, /secret|private@example\.com|api_key/i);

console.log('BetterToken production-only analytics check passed.');
