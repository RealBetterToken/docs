#!/usr/bin/env node

import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { syncToolProviderSupport } from './sync-tool-provider-support.mjs';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const data = JSON.parse(await readFile(path.join(rootDir, 'data', 'tool-provider-support.json'), 'utf8'));
const oldTerms = [
  /GPT 分组/i,
  /Claude 分组/i,
  /GPT Key group/i,
  /Claude Key group/i,
  /групп[а-яё ]*(?:ключа )?GPT/i,
  /групп[а-яё ]*(?:ключа )?Claude/i
];

const required = {
  ru: ['Ключевые параметры', 'Подготовка', 'Установка', 'Ручная настройка', 'Проверка подключения', 'Смена модели', 'Частые ошибки', 'Расширенная настройка', 'Технические детали'],
  en: ['Key settings', 'Prerequisites', 'Install', 'Manual setup', 'Verify the connection', 'Switch models', 'Common errors', 'Advanced setup', 'Technical details'],
  zh: ['重点信息', '准备工作', '安装', '手动配置', '验证连接', '切换模型', '常见错误', '进阶配置', '技术说明']
};
const commandHeading = {
  ru: 'Настройка командой',
  en: 'Command-line setup',
  zh: '命令行配置'
};

async function collectMdx(directory) {
  const files = [];
  for (const entry of await readdir(directory, {withFileTypes: true})) {
    if (['.git', '.mintlify', '.mintlify-llmeasy', 'node_modules'].includes(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collectMdx(fullPath));
    else if (entry.isFile() && entry.name.endsWith('.mdx')) files.push(fullPath);
  }
  return files;
}

for (const tool of Object.keys(data.tools)) {
  for (const [locale, headings] of Object.entries(required)) {
    const directory = locale === 'ru' ? '' : locale;
    const relativePagePath = data.pagePaths?.[tool] ?? path.join('ai-tools', tool);
    const pagePath = path.join(rootDir, directory, `${relativePagePath}.mdx`);
    const source = await readFile(pagePath, 'utf8');

    assert.match(source, /^title:\s*".+"/m, `${pagePath} is missing an SEO title`);
    assert.match(source, /^description:\s*".+"/m, `${pagePath} is missing an SEO description`);
    assert.match(source, /^\| API Key \| .+ \|$/m, `${pagePath} is missing the API Key core value`);
    assert.match(
      source,
      /^\| (?:Base URL|Full request URL|完整请求 URL|Полный URL запроса) \| .+ \|$/m,
      `${pagePath} is missing the Base URL or full request URL core value`
    );
    assert.match(source, /^\| Model \| .+ \|$/m, `${pagePath} is missing the Model core value`);

    let previousIndex = -1;
    for (const heading of headings) {
      assert.match(source, new RegExp(`^## ${heading}$`, 'm'), `${pagePath} is missing "${heading}"`);
      const currentIndex = source.indexOf(`## ${heading}`);
      assert.ok(currentIndex > previousIndex, `${pagePath} has "${heading}" out of order`);
      previousIndex = currentIndex;
    }
    assert.match(source, /\{\/\* tool-provider-support:start \*\/\}/, `${pagePath} is missing provider support markers`);
    assert.match(source, /\{\/\* tool-provider-support:end \*\/\}/, `${pagePath} is missing provider support markers`);
    for (const term of oldTerms) {
      assert.doesNotMatch(source, term, `${pagePath} still uses an old key-group term`);
    }
    if (Object.values(data.tools[tool]).includes('cli_manual')) {
      assert.match(
        source,
        new RegExp(`^## ${commandHeading[locale]}$`, 'm'),
        `${pagePath} is missing the command-line setup required by the provider matrix`
      );
      const installIndex = source.indexOf(`## ${headings[2]}`);
      const commandIndex = source.indexOf(`## ${commandHeading[locale]}`);
      const manualIndex = source.indexOf(`## ${headings[3]}`);
      assert.ok(
        installIndex < commandIndex && commandIndex < manualIndex,
        `${pagePath} has the command-line setup out of order`
      );
    } else {
      assert.doesNotMatch(
        source,
        new RegExp(`^## ${commandHeading[locale]}$`, 'm'),
        `${pagePath} documents command-line setup that is not supported by the provider matrix`
      );
    }
    assert.doesNotMatch(
      source,
      /<Tab title="[^"]*CC Switch[^"]*">/i,
      `${pagePath} still embeds CC Switch in the primary setup flow`
    );
    const advancedHeading = locale === 'ru' ? '## Расширенная настройка' : locale === 'en'
      ? '## Advanced setup'
      : '## 进阶配置';
    const advancedIndex = source.indexOf(advancedHeading);
    const providerStartIndex = source.indexOf('{/* tool-provider-support:start */}');
    const technicalIndex = source.indexOf(`## ${headings.at(-1)}`);
    assert.ok(
      advancedIndex < providerStartIndex && providerStartIndex < technicalIndex,
      `${pagePath} must place provider support inside Advanced setup`
    );
    const sourceWithoutProviderTable = source.replace(
      /\{\/\* tool-provider-support:start \*\/\}[\s\S]*?\{\/\* tool-provider-support:end \*\/\}/,
      ''
    );
    const ccSwitchIndex = sourceWithoutProviderTable.indexOf('CC Switch');
    if (ccSwitchIndex >= 0) {
      assert.ok(
        sourceWithoutProviderTable.indexOf(advancedHeading) >= 0
          && ccSwitchIndex > sourceWithoutProviderTable.indexOf(advancedHeading),
        `${pagePath} mentions CC Switch outside the advanced section`
      );
    }
  }
}

await syncToolProviderSupport({check: true});

for (const pagePath of await collectMdx(rootDir)) {
  const source = await readFile(pagePath, 'utf8');
  for (const term of oldTerms) {
    assert.doesNotMatch(source, term, `${pagePath} still uses an old key-group term`);
  }
  assert.doesNotMatch(source, /Key group|key group|Группа ключа|группа ключа/i);
}

console.log('Tool documentation structure and provider support tables are valid.');
