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
  zh: ['重点信息', '准备工作', '安装', '手动配置', '验证连接', '切换模型', '常见错误', '进阶配置', '技术说明'],
  hi: ['मुख्य सेटिंग्स', 'आवश्यकताएं', 'इंस्टॉल करें', 'मैन्युअल सेटअप', 'कनेक्शन सत्यापित करें', 'मॉडल बदलें', 'सामान्य त्रुटियां', 'उन्नत सेटअप', 'तकनीकी विवरण'],
  es: ['Ajustes principales', 'Requisitos previos', 'Instalación', 'Configuración manual', 'Verificar la conexión', 'Cambiar de modelo', 'Errores frecuentes', 'Configuración avanzada', 'Detalles técnicos'],
  'pt-br': ['Configurações principais', 'Pré-requisitos', 'Instalação', 'Configuração manual', 'Verificar a conexão', 'Trocar de modelo', 'Erros comuns', 'Configuração avançada', 'Detalhes técnicos'],
  ja: ['主要設定', '前提条件', 'インストール', '手動設定', '接続の確認', 'モデルの切り替え', 'よくあるエラー', '高度な設定', '技術情報'],
  fr: ['Paramètres principaux', 'Prérequis', 'Installation', 'Configuration manuelle', 'Vérifier la connexion', 'Changer de modèle', 'Erreurs fréquentes', 'Configuration avancée', 'Détails techniques'],
  de: ['Wichtige Einstellungen', 'Voraussetzungen', 'Installation', 'Manuelle Konfiguration', 'Verbindung prüfen', 'Modell wechseln', 'Häufige Fehler', 'Erweiterte Konfiguration', 'Technische Details'],
  ko: ['주요 설정', '사전 요구 사항', '설치', '수동 설정', '연결 확인', '모델 전환', '자주 발생하는 오류', '고급 설정', '기술 세부 정보']
};
const commandHeading = {
  ru: 'Настройка командой',
  en: 'Command-line setup',
  zh: '命令行配置',
  hi: 'कमांड लाइन सेटअप',
  es: 'Configuración por línea de comandos',
  'pt-br': 'Configuração pela linha de comando',
  ja: 'コマンドラインでの設定',
  fr: 'Configuration en ligne de commande',
  de: 'Einrichtung über die Befehlszeile',
  ko: '명령줄 설정'
};

const headingAliases = {
  hi: {
    'मुख्य सेटिंग्स': ['मुख्य सेटिंग्स', 'मुख्य सेटिंग'],
    आवश्यकताएं: ['आवश्यकताएं', 'आवश्यक शर्तें'],
    'इंस्टॉल करें': ['इंस्टॉल करें', 'इंस्टॉलेशन'],
    'कनेक्शन सत्यापित करें': ['कनेक्शन सत्यापित करें', 'कनेक्शन जांचें'],
  },
  es: {
    Instalación: ['Instalación', 'Instalar'],
    'Verificar la conexión': ['Verificar la conexión', 'Verifica la conexión'],
    'Cambiar de modelo': ['Cambiar de modelo', 'Cambia de modelo'],
    'Errores frecuentes': ['Errores frecuentes', 'Errores habituales', 'Errores comunes'],
  },
  'pt-br': {
    Instalação: ['Instalação', 'Instalar'],
    'Verificar a conexão': ['Verificar a conexão', 'Verifique a conexão', 'Teste a conexão'],
    'Trocar de modelo': ['Trocar de modelo', 'Alterne entre modelos'],
    'Configuração avançada': ['Configuração avançada', 'Advanced setup'],
  },
  ja: {
    '主要設定': ['主要設定', '主要な設定', '主な設定'],
    '前提条件': ['前提条件', '事前準備'],
    '手動設定': ['手動設定', '手動で設定する'],
    '接続の確認': ['接続の確認', '接続を確認する'],
    'モデルの切り替え': ['モデルの切り替え', 'モデルを切り替える'],
    '高度な設定': ['高度な設定', '詳細設定', 'Advanced setup'],
    '技術情報': ['技術情報', '技術詳細', '技術的な詳細'],
  },
  fr: {
    'Paramètres principaux': ['Paramètres principaux', 'Paramètres clés'],
    'Erreurs fréquentes': ['Erreurs fréquentes', 'Erreurs courantes'],
    'Configuration avancée': ['Configuration avancée', 'Advanced setup'],
  },
  de: {
    'Manuelle Konfiguration': ['Manuelle Konfiguration', 'Manuelle Einrichtung'],
    'Verbindung prüfen': ['Verbindung prüfen', 'Verbindung überprüfen'],
    'Modell wechseln': ['Modell wechseln', 'Modelle wechseln'],
    'Erweiterte Konfiguration': ['Erweiterte Konfiguration', 'Erweiterte Einrichtung', 'Advanced setup'],
  },
  ko: {
    '사전 요구 사항': ['사전 요구 사항', '준비 사항'],
    설치: ['설치', '설치하기'],
    '자주 발생하는 오류': ['자주 발생하는 오류', '일반적인 오류', '흔한 오류'],
    '고급 설정': ['고급 설정', 'Advanced setup'],
  },
};

const coreFieldAliases = {
  'Full request URL': ['Full request URL', 'पूर्ण request URL', 'URL completa de la solicitud', 'URL completa da solicitação', '完全なリクエスト URL', 'URL complète de Request', 'Vollständige Request-URL', '전체 request URL'],
  Model: ['Model', 'Modelo', 'मॉडल', 'モデル', 'Modèle', 'Modell', '모델'],
};

const commandHeadingAliases = {
  hi: ['कमांड लाइन सेटअप', 'Command-line सेटअप'],
  es: ['Configuración por línea de comandos', 'Configuración mediante la línea de comandos'],
  ja: ['コマンドラインでの設定', 'コマンドラインで設定する'],
  fr: ['Configuration en ligne de commande', 'Configuration par la ligne de commande'],
  de: ['Einrichtung über die Befehlszeile', 'Konfiguration über die Befehlszeile'],
};

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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
    const requestUrlFields = ['Base URL', '完整请求 URL', 'Полный URL запроса', ...coreFieldAliases['Full request URL']]
      .map(escapeRegex)
      .join('|');
    assert.match(
      source,
      new RegExp(`^\\| (?:${requestUrlFields}) \\| .+ \\|$`, 'm'),
      `${pagePath} is missing the Base URL or full request URL core value`
    );
    const modelFields = coreFieldAliases.Model.map(escapeRegex).join('|');
    assert.match(source, new RegExp(`^\\| (?:${modelFields}) \\| .+ \\|$`, 'm'), `${pagePath} is missing the Model core value`);

    let previousIndex = -1;
    for (const heading of headings) {
      const acceptedHeadings = headingAliases[locale]?.[heading] ?? [heading];
      const headingMatch = source.match(new RegExp(
        `^## (?:${acceptedHeadings.map(escapeRegex).join('|')})$`,
        'm',
      ));
      assert(headingMatch, `${pagePath} is missing "${heading}"`);
      const currentIndex = headingMatch.index;
      assert.ok(currentIndex > previousIndex, `${pagePath} has "${heading}" out of order`);
      previousIndex = currentIndex;
    }
    assert.match(source, /\{\/\* tool-provider-support:start \*\/\}/, `${pagePath} is missing provider support markers`);
    assert.match(source, /\{\/\* tool-provider-support:end \*\/\}/, `${pagePath} is missing provider support markers`);
    for (const term of oldTerms) {
      assert.doesNotMatch(source, term, `${pagePath} still uses an old key-group term`);
    }
    if (Object.values(data.tools[tool]).includes('cli_manual')) {
      const acceptedCommandHeadings = commandHeadingAliases[locale] ?? [commandHeading[locale]];
      const commandMatch = source.match(new RegExp(
        `^## (?:${acceptedCommandHeadings.map(escapeRegex).join('|')})$`,
        'm',
      ));
      assert(commandMatch, `${pagePath} is missing the command-line setup required by the provider matrix`);
      const installHeadings = headingAliases[locale]?.[headings[2]] ?? [headings[2]];
      const manualHeadings = headingAliases[locale]?.[headings[3]] ?? [headings[3]];
      const installMatch = source.match(new RegExp(`^## (?:${installHeadings.map(escapeRegex).join('|')})$`, 'm'));
      const manualMatch = source.match(new RegExp(`^## (?:${manualHeadings.map(escapeRegex).join('|')})$`, 'm'));
      const installIndex = installMatch.index;
      const commandIndex = commandMatch.index;
      const manualIndex = manualMatch.index;
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
    const advancedHeadings = headingAliases[locale]?.[headings[7]] ?? [headings[7]];
    const advancedMatch = source.match(new RegExp(`^## (?:${advancedHeadings.map(escapeRegex).join('|')})$`, 'm'));
    const advancedIndex = advancedMatch.index;
    const providerStartIndex = source.indexOf('{/* tool-provider-support:start */}');
    const technicalHeadings = headingAliases[locale]?.[headings.at(-1)] ?? [headings.at(-1)];
    const technicalMatch = source.match(new RegExp(`^## (?:${technicalHeadings.map(escapeRegex).join('|')})$`, 'm'));
    const technicalIndex = technicalMatch.index;
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
      const advancedIndexWithoutProviderTable = sourceWithoutProviderTable.search(new RegExp(
        `^## (?:${advancedHeadings.map(escapeRegex).join('|')})$`,
        'm',
      ));
      assert.ok(
        advancedIndexWithoutProviderTable >= 0
          && ccSwitchIndex > advancedIndexWithoutProviderTable,
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
