#!/usr/bin/env node

import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataPath = path.join(rootDir, 'data', 'tool-provider-support.json');
const startMarker = '{/* tool-provider-support:start */}';
const endMarker = '{/* tool-provider-support:end */}';
const legacyStartMarker = '<!-- tool-provider-support:start -->';
const legacyEndMarker = '<!-- tool-provider-support:end -->';

const locales = {
  ru: {
    directory: '',
    advancedHeading: '## Расширенная настройка',
    heading: 'Поддерживаемые провайдеры',
    provider: 'Провайдер',
    status: 'Статус',
    note: 'Статусы относятся к способу подключения BetterToken, описанному на этой странице.',
    explanationTitle: 'Что означают способы настройки',
    explanations: {
      cli_manual: '**Настройка командой + вручную**: доступна готовая команда и полная ручная настройка.',
      manual: '**Ручная настройка**: укажите API Key, Base URL и Model.',
      advanced: '**Расширенная настройка**: установите CC Switch и используйте локальный proxy, преобразование протокола или mapping моделей.',
      unsupported: '**Не поддерживается**: проверенный способ прямого подключения пока отсутствует.'
    },
    labels: {
      cli_manual: 'Настройка командой + вручную',
      manual: 'Ручная настройка',
      recommended: 'Рекомендуется',
      supported: 'Поддерживается',
      advanced: 'Расширенная настройка',
      unverified: 'Не проверено',
      unsupported: 'Не поддерживается'
    }
  },
  en: {
    directory: 'en',
    advancedHeading: '## Advanced setup',
    heading: 'Supported providers',
    provider: 'Provider',
    status: 'Status',
    note: 'Statuses apply to the BetterToken setup documented on this page.',
    explanationTitle: 'What the setup methods mean',
    explanations: {
      cli_manual: '**Command-line + manual setup**: use a generated command or follow the complete manual steps.',
      manual: '**Manual setup**: enter the API Key, Base URL, and Model.',
      advanced: '**Advanced setup**: install CC Switch and use a local proxy, protocol conversion, or model mapping.',
      unsupported: '**Not supported**: no verified direct setup is currently available.'
    },
    labels: {
      cli_manual: 'Command-line + manual setup',
      manual: 'Manual setup',
      recommended: 'Recommended',
      supported: 'Supported',
      advanced: 'Advanced setup',
      unverified: 'Not verified',
      unsupported: 'Not supported'
    }
  },
  zh: {
    directory: 'zh',
    advancedHeading: '## 进阶配置',
    heading: '支持的提供商',
    provider: '提供商',
    status: '状态',
    note: '状态仅针对本页介绍的 BetterToken 接入方式。',
    explanationTitle: '配置方式说明',
    explanations: {
      cli_manual: '**命令行配置 + 手动配置**：可以使用生成的一键命令，也可以按照完整步骤手动配置。',
      manual: '**手动配置**：填写 API Key、Base URL 和 Model。',
      advanced: '**进阶配置**：安装 CC Switch，并使用本地代理、协议转换或模型映射。',
      unsupported: '**不支持**：当前没有经过验证的直接配置方式。'
    },
    labels: {
      cli_manual: '命令行配置 + 手动配置',
      manual: '手动配置',
      recommended: '推荐',
      supported: '支持',
      advanced: '进阶配置',
      unverified: '未验证',
      unsupported: '暂不支持'
    }
  }
};

function renderTable(config, providers, support, {headingLevel = '##'} = {}) {
  const rows = providers.map((provider) => {
    const status = support[provider];
    if (!config.labels[status]) {
      throw new Error(`Unknown provider status "${status}" for ${provider}`);
    }
    return `| ${provider} | ${config.labels[status]} |`;
  });
  const explanations = [...new Set(Object.values(support))]
    .map((status) => config.explanations[status])
    .filter(Boolean);

  return [
    startMarker,
    `${headingLevel} ${config.heading}`,
    '',
    `| ${config.provider} | ${config.status} |`,
    '| --- | --- |',
    ...rows,
    '',
    `<Note>${config.note}</Note>`,
    '',
    `<Accordion title="${config.explanationTitle}">`,
    ...explanations.map((explanation) => `  - ${explanation}`),
    '</Accordion>',
    endMarker
  ].join('\n');
}

export async function syncToolProviderSupport({check = false} = {}) {
  const data = JSON.parse(await readFile(dataPath, 'utf8'));
  const changed = [];

  for (const [tool, support] of Object.entries(data.tools)) {
    for (const config of Object.values(locales)) {
      const relativePagePath = data.pagePaths?.[tool] ?? path.join('ai-tools', tool);
      const pagePath = path.join(rootDir, config.directory, `${relativePagePath}.mdx`);
      const source = await readFile(pagePath, 'utf8');
      const sourceStartMarker = source.includes(startMarker) ? startMarker : legacyStartMarker;
      const sourceEndMarker = source.includes(endMarker) ? endMarker : legacyEndMarker;
      const start = source.indexOf(sourceStartMarker);
      const end = source.indexOf(sourceEndMarker);

      if (start < 0 || end < start) {
        throw new Error(`Provider support markers are missing in ${path.relative(rootDir, pagePath)}`);
      }

      const providerTableIsNested = source.lastIndexOf(config.advancedHeading, start) >= 0;
      const replacement = renderTable(config, data.providers, support, {
        headingLevel: providerTableIsNested ? '###' : '##'
      });
      const next = `${source.slice(0, start)}${replacement}${source.slice(end + sourceEndMarker.length)}`;

      if (next !== source) {
        changed.push(path.relative(rootDir, pagePath));
        if (!check) await writeFile(pagePath, next);
      }
    }
  }

  if (check && changed.length > 0) {
    throw new Error(`Provider support tables are out of date:\n${changed.join('\n')}`);
  }

  return changed;
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  const check = process.argv.includes('--check');
  const changed = await syncToolProviderSupport({check});
  console.log(check ? 'Tool provider support tables are in sync.' : `Updated ${changed.length} tool provider tables.`);
}
