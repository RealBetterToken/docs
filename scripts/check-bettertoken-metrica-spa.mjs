#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = await readFile(path.join(rootDir, 'scripts', 'llmeasy-metrica-spa.js.template'), 'utf8');
const listeners = new Map();
const hits = [];
let currentUrl = new URL('https://docs.bettertoken.ai/en/quickstart?_ym_debug=2');
let currentPath = currentUrl.pathname;

const location = {
  get href() {
    return currentUrl.href;
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

const document = {
  title: 'Quickstart | LLMEasy',
  documentElement: {
    getAttribute(name) {
      return name === 'data-current-path' ? currentPath : null;
    },
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

const window = {
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
    hits.push(JSON.parse(JSON.stringify(args)));
  },
};

vm.runInNewContext(source, {
  Date,
  URL,
  console,
  document,
  window,
});

assert.equal(hits.length, 0, 'initial load must rely on the automatic Metrica page view');

history.pushState({}, '', '/en/ai-tools/codex?_ym_debug=2');
assert.equal(hits.length, 0, 'route hit must wait until the document title is updated');
document.title = 'Codex | LLMEasy';
await new Promise((resolve) => setTimeout(resolve, 80));

assert.deepEqual(hits, [[
  110565477,
  'hit',
  'https://docs.bettertoken.ai/en/ai-tools/codex?_ym_debug=2',
  { title: 'Codex | LLMEasy' },
]]);

history.replaceState({}, '', '/en/ai-tools/codex?_ym_debug=2');
history.pushState({}, '', '/en/ai-tools/codex?_ym_debug=2');
await new Promise((resolve) => setTimeout(resolve, 20));
assert.equal(hits.length, 1, 'the same route must not be reported twice');

history.pushState({}, '', '/en/faq/claude-desktop-llmeasy-api?_ym_debug=2');
document.title = 'Claude Desktop | LLMEasy';
await new Promise((resolve) => setTimeout(resolve, 80));
assert.equal(hits.length, 2, 'a second document route must produce one hit');

currentUrl = new URL('https://docs.bettertoken.ai/en/ai-tools/codex?_ym_debug=2');
currentPath = currentUrl.pathname;
listeners.get('popstate')();
document.title = 'Codex | LLMEasy';
await new Promise((resolve) => setTimeout(resolve, 80));

assert.equal(hits.length, 3, 'back navigation must produce one hit');
assert.deepEqual(hits[2], [
  110565477,
  'hit',
  'https://docs.bettertoken.ai/en/ai-tools/codex?_ym_debug=2',
  { title: 'Codex | LLMEasy' },
]);

console.log('BetterToken Yandex Metrica SPA tracking check passed.');
