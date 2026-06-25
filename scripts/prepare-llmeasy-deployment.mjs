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
## Контакты и регион обслуживания

LLM Easy предоставляет API-шлюз для AI-моделей пользователям в России.

Для поддержки на русском или английском языке свяжитесь с LLM Easy в Telegram:
<a href="https://t.me/+j1DJr0c_a1JhZmM0">https://t.me/+j1DJr0c_a1JhZmM0</a>

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
## Contact and service region

LLM Easy provides an AI model API gateway for users in Russia.

For customer support in Russian or English, contact LLM Easy through Telegram:
<a href="https://t.me/+j1DJr0c_a1JhZmM0">https://t.me/+j1DJr0c_a1JhZmM0</a>

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
## 联系方式与服务区域

LLM Easy 为俄罗斯用户提供 AI 模型 API 网关服务。

如需俄语或英语客户支持，请通过 Telegram 联系 LLM Easy：
<a href="https://t.me/+j1DJr0c_a1JhZmM0">https://t.me/+j1DJr0c_a1JhZmM0</a>

- 主站：<a href="https://www.llmeasy.ru/">https://www.llmeasy.ru/</a>
- 服务控制台：<a href="https://www.llmeasy.ru/workspace">https://www.llmeasy.ru/workspace</a>
- 联系页面：<a href="https://www.llmeasy.ru/contacts">https://www.llmeasy.ru/contacts</a>
- 服务区域：俄罗斯
`,
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
await updateLlmeasyQuickstartSetup();
await generateRootFavicon();
await addContactSections();
await generateLlmsFull();
await generateIndexNowKeyFile();

const relativeOutput = path.relative(rootDir, outputDir) || '.';
console.log(`Prepared LLMEasy docs deployment at ${relativeOutput}`);
console.log(`Next: cd ${relativeOutput} && mint broken-links && mint validate`);
