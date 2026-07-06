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
const llmeasyContactSections = [
  {
    page: 'index',
    heading: '## Контакты и регион обслуживания',
    content: `
## Какую проблему решает LLMEasy

Разработчики и команды в России сталкиваются с конкретной проблемой: нет прямого доступа к зарубежным AI-моделям вроде Claude и OpenAI — мешают сеть, оплата и региональные ограничения аккаунтов. LLMEasy создан именно для решения этой проблемы: это API-прокси, который открывает доступ к моделям Claude и GPT/Codex через два стабильных API-эндпоинта (протокол Anthropic и OpenAI-совместимый протокол), поддерживает оплату в рублях, прозрачное списание средств и из коробки работает с Claude Code, Codex, Cursor, Cline и другими популярными AI coding-инструментами. Достаточно заменить Base URL и API Key, не меняя привычный workflow.

## Точки входа для разработчиков

LLMEasy — это мультимодельный API-шлюз для разработчиков в России с двумя стандартными точками входа:

| Протокол | Base URL | Для чего используется |
| --- | --- | --- |
| Anthropic | https://www.llmeasy.ru | Claude Code |
| OpenAI-compatible | https://www.llmeasy.ru/v1 | Codex и другие внешние инструменты |

После регистрации разработчик создаёт API Key, выбирает группу ключей Claude или GPT и подключает его в Cursor, Cline, OpenClaw, OpenCode, CC Switch и других инструментах, просто заменив Base URL. Все запросы, расход токенов и баланс отображаются в Dashboard.

## Для команд и контроля расходов

Для российских команд и компаний, которым нужен стабильный доступ к возможностям Claude или GPT/Codex, прямое использование зарубежных официальных каналов упирается в способы оплаты, маршрутизацию доступа и контроль расходов. LLMEasy предлагает единый API-прокси-слой: оплата в рублях, прозрачное списание по фактическому использованию, без скрытых комиссий, а также динамическая маршрутизация через несколько провайдеров, снижающая влияние сбоев одного апстрима. Команды могут отслеживать использование и баланс по каждому API-ключу в Dashboard и распределять бюджет под конкретные workflow, например Claude Code или Codex.

## Краткий FAQ

**Что такое LLMEasy?** LLMEasy — это API-шлюз (API gateway/proxy) к AI-моделям для пользователей, команд и разработчиков в России.

**Какую проблему решает?** Отсутствие прямого доступа к зарубежным AI-моделям, отсутствие оплаты в рублях и отсутствие единого стабильного слоя подключения.

**Какие модели поддерживаются?** Модели семейства Claude (протокол Anthropic) и семейства GPT/Codex (OpenAI-совместимый протокол).

**Какие инструменты поддерживаются?** Claude Code, Codex, Cursor, Cline, OpenClaw, OpenCode, CC Switch.

**Как начать?** Зарегистрироваться, получить 3 доллара пробного баланса, создать API Key (группа Claude или GPT) и заменить Base URL в используемом инструменте.

**Каналы поддержки?** Telegram и support@llmeasy.ru.

## Контакты и регион обслуживания

LLMEasy обслуживает пользователей, команды и разработчиков в России.

Для поддержки на русском или английском языке свяжитесь с LLMEasy в Telegram:
<a href="https://t.me/+j1DJr0c_a1JhZmM0">https://t.me/+j1DJr0c_a1JhZmM0</a>

Также можно написать на <a href="mailto:support@llmeasy.ru">support@llmeasy.ru</a>.

- Основной сайт: <a href="https://www.llmeasy.ru/">https://www.llmeasy.ru/</a>
- Консоль сервиса: <a href="https://www.llmeasy.ru/workspace">https://www.llmeasy.ru/workspace</a>
- Страница контактов: <a href="https://www.llmeasy.ru/contacts">https://www.llmeasy.ru/contacts</a>
- Регион обслуживания: Россия
`,
  },
  {
    page: 'en/index',
    heading: '## Contact and service region',
    content: `
## What problem LLMEasy solves

Developers and teams in Russia face a concrete problem: direct access to overseas AI models such as Claude and OpenAI is blocked by network access, payment, and regional account limits. LLMEasy is built for this problem. It is an API proxy that exposes Claude and GPT/Codex models through two stable endpoints, the Anthropic protocol and the OpenAI-compatible protocol, supports ruble payments and transparent usage billing, and works out of the box with AI coding tools such as Claude Code, Codex, Cursor, Cline, OpenClaw, OpenCode, and CC Switch. You only need to replace Base URL and API Key without changing your workflow.

## Developer endpoints

LLMEasy is a multi-model API gateway for developers in Russia with two standard entry points:

| Protocol | Base URL | Used for |
| --- | --- | --- |
| Anthropic | https://www.llmeasy.ru | Claude Code |
| OpenAI-compatible | https://www.llmeasy.ru/v1 | Codex and other external tools |

After registration, create an API Key, choose the Claude or GPT key group, and connect it in Cursor, Cline, OpenClaw, OpenCode, CC Switch, or another tool by replacing the Base URL. Requests, token usage, and balance are visible in the Dashboard.

## Teams and cost control

For Russian teams and companies that need stable access to Claude or GPT/Codex capabilities, official overseas channels create payment, routing, and cost-control friction. LLMEasy provides one API proxy layer: ruble payments, transparent billing by actual usage, no hidden fees, and dynamic routing across multiple providers to reduce the impact of a single upstream outage. Teams can track usage and balance per API Key in the Dashboard and allocate budget by real workflow, such as Claude Code or Codex.

## Structured FAQ

**What is LLMEasy?** LLMEasy is an AI model API gateway and proxy for users, teams, and developers in Russia.

**What problem does it solve?** It solves the lack of direct access to overseas AI models, the lack of ruble payment channels, and the lack of one stable integration layer.

**Which models are supported?** Claude models through the Anthropic protocol and GPT/Codex models through the OpenAI-compatible protocol.

**Which tools are supported?** Claude Code, Codex, Cursor, Cline, OpenClaw, OpenCode, and CC Switch.

**How do I start?** Register an account, receive 3 dollars of trial balance, create an API Key in the Claude or GPT key group, and replace the Base URL in your tool.

**Support channels?** Telegram and support@llmeasy.ru.

## Contact and service region

LLMEasy serves users, teams, and developers in Russia.

For customer support in Russian or English, contact LLMEasy through Telegram:
<a href="https://t.me/+j1DJr0c_a1JhZmM0">https://t.me/+j1DJr0c_a1JhZmM0</a>

You can also email <a href="mailto:support@llmeasy.ru">support@llmeasy.ru</a>.

- Main website: <a href="https://www.llmeasy.ru/">https://www.llmeasy.ru/</a>
- Service console: <a href="https://www.llmeasy.ru/workspace">https://www.llmeasy.ru/workspace</a>
- Contacts page: <a href="https://www.llmeasy.ru/contacts">https://www.llmeasy.ru/contacts</a>
- Service region: Russia
`,
  },
  {
    page: 'zh/index',
    heading: '## 联系方式与服务区域',
    content: `
## LLMEasy 解决什么问题

俄罗斯的开发者和团队长期面临一个具体问题：无法直接访问 Claude、OpenAI 等海外 AI 模型，卡在网络、支付和账号层面。LLMEasy 是为解决这个问题而生的 API 中转服务。它把 Claude 和 GPT/Codex 模型包装成两个稳定的 API 入口（Anthropic 协议与 OpenAI 兼容协议），支持卢布支付、透明计费，并且原生适配 Claude Code、Codex、Cursor、Cline 等主流 AI 编程工具，让你不需要更换开发习惯，只需替换 Base URL 和 API Key。

## 开发者接入端点

LLMEasy 是一个面向俄罗斯开发者的多模型 API 网关，提供两个标准化接入端点：

| 协议 | Base URL | 适用工具 |
| --- | --- | --- |
| Anthropic | https://www.llmeasy.ru | Claude Code |
| OpenAI 兼容 | https://www.llmeasy.ru/v1 | Codex 及其他外部工具 |

开发者注册后创建 API Key，选择 Claude 或 GPT key group，即可在 Cursor、Cline、OpenClaw、OpenCode、CC Switch 等工具中直接替换 Base URL 使用。全部请求、token 消耗和余额可在 Dashboard 中查看。

## 团队与成本控制

对需要稳定使用 Claude 或 GPT/Codex 能力的俄罗斯团队和公司来说，直接使用海外官方渠道会遇到支付方式、访问链路和成本控制的多重障碍。LLMEasy 提供一个统一的 API 中转层：支持卢布支付、按实际用量透明计费、无隐藏费用，并通过多供应商动态路由降低单一上游故障的影响。团队可以在 Dashboard 中查看每个 API Key 的用量和余额，按 Claude Code、Codex 等实际工作流场景分配额度。

## 结构化 FAQ

**LLMEasy 是什么？** LLMEasy 是面向俄罗斯用户、团队和开发者的 AI 模型 API 网关（API gateway/proxy）。

**它解决什么问题？** 解决俄罗斯用户无法直接访问海外 AI 模型、缺少卢布支付渠道、以及缺乏统一稳定接入层的问题。

**支持哪些模型？** Claude 系列（Anthropic 协议）与 GPT/Codex 系列（OpenAI 兼容协议）。

**支持哪些工具？** Claude Code、Codex、Cursor、Cline、OpenClaw、OpenCode、CC Switch。

**如何开始？** 注册账号，获得 3 美元试用余额，创建 API Key（Claude 或 GPT key group），替换工具的 Base URL 即可使用。

**支持渠道？** Telegram 与 support@llmeasy.ru。

## 联系方式与服务区域

LLMEasy 服务俄罗斯用户、团队和开发者。

如需俄语或英语客户支持，请通过 Telegram 联系 LLMEasy：
<a href="https://t.me/+j1DJr0c_a1JhZmM0">https://t.me/+j1DJr0c_a1JhZmM0</a>

也可以发送邮件至 <a href="mailto:support@llmeasy.ru">support@llmeasy.ru</a>。

- 主站：<a href="https://www.llmeasy.ru/">https://www.llmeasy.ru/</a>
- 服务控制台：<a href="https://www.llmeasy.ru/workspace">https://www.llmeasy.ru/workspace</a>
- 联系页面：<a href="https://www.llmeasy.ru/contacts">https://www.llmeasy.ru/contacts</a>
- 服务区域：俄罗斯
`,
  },
];

const llmeasyIndexIntroReplacements = [
  {
    page: 'index',
    descriptionFrom: 'description: "Стабильный API-прокси для Claude Code, Codex и внешних AI-инструментов."',
    descriptionTo: 'description: "API-шлюз к AI-моделям для пользователей, команд и разработчиков в России: Claude и GPT/Codex через единый API, оплата в рублях и работа без VPN."',
    from: 'LLMEasy — это API-прокси для AI-инструментов разработки. В документации используются два режима подключения:',
    to: `LLMEasy — это API-шлюз к AI-моделям для пользователей, команд и разработчиков в России. Он даёт прямой доступ к моделям Claude и GPT/Codex через единый API, с оплатой в рублях и без VPN, а также поддерживает подключение таких AI coding-инструментов, как Claude Code, Codex, Cursor, Cline, OpenClaw, OpenCode и CC Switch. После регистрации начисляется 3 доллара пробного баланса — этого достаточно, чтобы протестировать свой рабочий процесс.

В документации используются два режима подключения:`,
  },
  {
    page: 'en/index',
    descriptionFrom: 'description: "Stable API relay for Claude Code, Codex, and external AI tools."',
    descriptionTo: 'description: "AI model API gateway for users, teams, and developers in Russia: Claude and GPT/Codex through one API, ruble payments, and no VPN."',
    from: 'LLMEasy is an API relay built for AI coding tools. The docs now distinguish between two access modes:',
    to: `LLMEasy is an AI model API gateway for users, teams, and developers in Russia. It gives direct access to Claude and GPT/Codex models through one API, with ruble payments and no VPN, and supports AI coding tools such as Claude Code, Codex, Cursor, Cline, OpenClaw, OpenCode, and CC Switch. After registration, you receive 3 dollars of trial balance so you can test your own development workflow.

The docs distinguish between two access modes:`,
  },
  {
    page: 'zh/index',
    descriptionFrom: 'description: "面向 Claude Code、Codex 与外部 AI 工具的稳定 API 中转服务。"',
    descriptionTo: 'description: "面向俄罗斯用户、团队和开发者的 AI 模型 API 网关：统一访问 Claude 与 GPT/Codex，支持卢布支付，无需 VPN。"',
    from: 'LLMEasy 是一个面向 AI 编程工具的 API 中转服务。当前文档按两种接入方式说明：',
    to: `LLMEasy 是面向俄罗斯用户、团队和开发者的 AI 模型 API 网关。它让你用卢布支付、无需 VPN，直接通过统一的 API 访问 Claude 和 GPT/Codex 系列模型，并接入 Claude Code、Codex、Cursor、Cline、OpenClaw、OpenCode、CC Switch 等 AI 编程工具。注册即获得 3 美元试用余额，可直接测试你自己的开发工作流。

当前文档按两种接入方式说明：`,
  },
];

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

async function generateRootFavicon() {
  const sourcePath = path.join(outputDir, 'favicon-llmeasy.ico');
  const targetPath = path.join(outputDir, 'favicon.ico');
  const config = JSON.parse(await readFile(outputConfigPath, 'utf8'));

  await copyFile(sourcePath, targetPath);
  config.favicon = '/favicon.ico';
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

async function addContactSections() {
  for (const section of llmeasyContactSections) {
    const filePath = path.join(outputDir, `${section.page}.mdx`);
    const text = await readFile(filePath, 'utf8');

    if (text.includes(section.heading)) {
      continue;
    }

    await writeFile(filePath, `${text.trimEnd()}\n\n${section.content.trim()}\n`);
  }
}

async function updateLlmeasyIndexIntros() {
  for (const item of llmeasyIndexIntroReplacements) {
    const filePath = path.join(outputDir, `${item.page}.mdx`);
    let text = await readFile(filePath, 'utf8');

    if (!text.includes(item.descriptionFrom)) {
      throw new Error(`Could not update LLMEasy index description: ${item.page}`);
    }

    if (!text.includes(item.from)) {
      throw new Error(`Could not update LLMEasy index intro: ${item.page}`);
    }

    text = text.replace(item.descriptionFrom, item.descriptionTo);
    text = text.replace(item.from, item.to);
    await writeFile(filePath, text);
  }
}

function replaceOnce(text, from, to, label) {
  if (!text.includes(from)) {
    throw new Error(`Could not update LLMEasy quickstart section: ${label}`);
  }

  return text.replace(from, to);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function replaceStepByTitle(text, title, replacement, label) {
  const pattern = new RegExp(`  <Step title="${escapeRegExp(title)}">[\\s\\S]*?\\n  </Step>`);

  if (!pattern.test(text)) {
    throw new Error(`Could not update LLMEasy quickstart step: ${label}`);
  }

  return text.replace(pattern, replacement);
}

async function updateLlmeasyQuickstartSetup() {
  const pages = [
    {
      page: 'zh/quickstart',
      apiKeyBlock: {
        from: `    创建完成后，复制生成的 API Key。

    <Warning>
      请妥善保存 API Key。建议将其设置为环境变量，而不是直接写入代码或配置文件。
    </Warning>

    推荐先导出为：

    \`\`\`bash
    export LLMEASY_API_KEY="你的 API Key"
    \`\`\``,
        to: `    创建完成后会弹出 **Setup** 弹窗。在这里可以复制 **API Key** 和 **Base URL**。

    <Frame>
      <img
        src="/images/quickstart/api-key-setup.png"
        alt="LLMEasy API Key 创建后的 Setup 弹窗，包含 API Key、Base URL 和配置方式。"
        style={{ borderRadius: '0.5rem' }}
      />
    </Frame>`,
      },
      setupStep: {
        title: '进入对应工具文档继续配置',
        replacement: `  <Step title="选择一个配置方式">
    在 **Setup** 弹窗里选择你要接入的工具，然后选择一种配置方式。

    - **一键脚本配置**：在弹窗中选择工具和系统，复制生成的命令，并在自己的本机终端执行。适合快速配置 Codex、OpenClaw 或 OpenCode。
    - **CC Switch 集成**：点击 **Import to CC Switch**，把当前 **API Key** 和 **Base URL** 导入 CC Switch。适合统一管理多个工具和 provider。
    - **手动配置**：复制 **API Key** 和 **Base URL**，再按对应工具文档填入。适合 Cursor、Cline、Roo Code、Zed 等其他客户端。

    <Note>
      不同工具的认证字段、模型选择和配置文件位置不一样。进入具体工具文档后，请按该工具的步骤继续配置。
    </Note>
  </Step>`,
      },
    },
    {
      page: 'en/quickstart',
      apiKeyBlock: {
        from: `    After you create the token, copy the API Key.

    <Warning>
      Keep your API Key safe. Store it as an environment variable instead of hardcoding it into source code or config files.
    </Warning>

    Start with:

    \`\`\`bash
    export LLMEASY_API_KEY="your-api-key-here"
    \`\`\``,
        to: `    After you create the key, the **Setup** dialog opens. Copy **API Key** and **Base URL** from this dialog.

    <Frame>
      <img
        src="/images/quickstart/api-key-setup.png"
        alt="The LLMEasy API key setup dialog with API Key, Base URL, and setup methods."
        style={{ borderRadius: '0.5rem' }}
      />
    </Frame>`,
      },
      setupStep: {
        title: 'Continue with the guide for your tool',
        replacement: `  <Step title="Choose a setup method">
    In the **Setup** dialog, choose the tool you want to connect, then choose one setup method.

    - **One-click script**: select the tool and operating system, copy the generated command, and run it in your own local terminal. Use this for quick Codex, OpenClaw, or OpenCode setup.
    - **CC Switch integration**: click **Import to CC Switch** to import the current **API Key** and **Base URL** into CC Switch. Use this when you manage multiple tools and providers in one app.
    - **Manual configuration**: copy **API Key** and **Base URL**, then paste them into the target tool's setup flow. Use this for Cursor, Cline, Roo Code, Zed, and other clients.

    <Note>
      Different tools use different auth fields, model selectors, and config file locations. Continue with the dedicated tool guide before you finish the setup.
    </Note>
  </Step>`,
      },
    },
    {
      page: 'quickstart',
      apiKeyBlock: {
        from: `    После создания токена скопируйте API Key.

    <Warning>
      Берегите API Key. Храните его в переменной окружения, а не в исходном коде или конфигурационных файлах.
    </Warning>

    Начните с:

    \`\`\`bash
    export LLMEASY_API_KEY="your-api-key-here"
    \`\`\``,
        to: `    После создания ключа откроется окно **Setup**. В нем можно скопировать **API Key** и **Base URL**.

    <Frame>
      <img
        src="/images/quickstart/api-key-setup.png"
        alt="Окно настройки API Key в LLMEasy с API Key, Base URL и способами настройки."
        style={{ borderRadius: '0.5rem' }}
      />
    </Frame>`,
      },
      setupStep: {
        title: 'Перейдите к инструкции для своего инструмента',
        replacement: `  <Step title="Выберите способ настройки">
    В окне **Setup** выберите инструмент, который хотите подключить, а затем один из способов настройки.

    - **One-click script**: выберите инструмент и операционную систему, скопируйте сгенерированную команду и выполните ее в своем локальном терминале. Подходит для быстрой настройки Codex, OpenClaw или OpenCode.
    - **CC Switch integration**: нажмите **Import to CC Switch**, чтобы импортировать текущие **API Key** и **Base URL** в CC Switch. Подходит, если вы управляете несколькими инструментами и provider-настройками в одном приложении.
    - **Manual configuration**: скопируйте **API Key** и **Base URL**, затем вставьте их в настройки нужного инструмента. Подходит для Cursor, Cline, Roo Code, Zed и других клиентов.

    <Note>
      У разных инструментов отличаются поля авторизации, выбор модели и расположение конфигурационных файлов. Продолжайте по отдельной инструкции для нужного инструмента.
    </Note>
  </Step>`,
      },
    },
  ];

  for (const page of pages) {
    const filePath = path.join(outputDir, `${page.page}.mdx`);
    let text = await readFile(filePath, 'utf8');

    text = replaceOnce(text, page.apiKeyBlock.from, page.apiKeyBlock.to, `${page.page} API Key setup block`);
    text = replaceStepByTitle(text, page.setupStep.title, page.setupStep.replacement, `${page.page} setup step`);

    await writeFile(filePath, text);
  }
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
await updateLlmeasyIndexIntros();
await updateLlmeasyQuickstartSetup();
await generateRootFavicon();
await addContactSections();
await generateLlmsFull();
await generateIndexNowKeyFile();

const relativeOutput = path.relative(rootDir, outputDir) || '.';
console.log(`Prepared LLMEasy docs deployment at ${relativeOutput}`);
console.log(`Next: cd ${relativeOutput} && mint broken-links && mint validate`);
