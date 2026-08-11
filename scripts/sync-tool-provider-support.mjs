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
  },
  hi: {
    directory: 'hi',
    advancedHeading: '## उन्नत सेटअप',
    heading: 'समर्थित provider',
    provider: 'Provider',
    status: 'स्थिति',
    note: 'ये स्थितियां केवल इस पेज पर बताए गए BetterToken सेटअप पर लागू होती हैं।',
    explanationTitle: 'सेटअप के तरीकों का अर्थ',
    explanations: {
      cli_manual: '**कमांड लाइन + मैन्युअल सेटअप**: तैयार कमांड का उपयोग करें या पूरे मैन्युअल चरणों का पालन करें।',
      manual: '**मैन्युअल सेटअप**: API Key, Base URL और Model दर्ज करें।',
      advanced: '**उन्नत सेटअप**: CC Switch इंस्टॉल करें और local proxy, protocol conversion या model mapping का उपयोग करें।',
      unsupported: '**समर्थित नहीं**: सीधे सेटअप का कोई सत्यापित तरीका अभी उपलब्ध नहीं है।'
    },
    labels: {
      cli_manual: 'कमांड लाइन + मैन्युअल सेटअप',
      manual: 'मैन्युअल सेटअप',
      recommended: 'सुझाया गया',
      supported: 'समर्थित',
      advanced: 'उन्नत सेटअप',
      unverified: 'सत्यापित नहीं',
      unsupported: 'समर्थित नहीं'
    }
  },
  es: {
    directory: 'es',
    advancedHeading: '## Configuración avanzada',
    heading: 'Proveedores compatibles',
    provider: 'Proveedor',
    status: 'Estado',
    note: 'Los estados se aplican al método de configuración de BetterToken descrito en esta página.',
    explanationTitle: 'Qué significa cada método de configuración',
    explanations: {
      cli_manual: '**Configuración por línea de comandos y manual**: usa un comando generado o sigue todos los pasos manuales.',
      manual: '**Configuración manual**: introduce la API Key, la Base URL y el Model.',
      advanced: '**Configuración avanzada**: instala CC Switch y usa un proxy local, conversión de protocolo o mapeo de modelos.',
      unsupported: '**No compatible**: todavía no hay un método de conexión directa verificado.'
    },
    labels: {
      cli_manual: 'Línea de comandos y configuración manual',
      manual: 'Configuración manual',
      recommended: 'Recomendado',
      supported: 'Compatible',
      advanced: 'Configuración avanzada',
      unverified: 'Sin verificar',
      unsupported: 'No compatible'
    }
  },
  'pt-br': {
    directory: 'pt-br',
    advancedHeading: '## Configuração avançada',
    heading: 'Provedores compatíveis',
    provider: 'Provedor',
    status: 'Status',
    note: 'Os status se aplicam ao método de configuração do BetterToken descrito nesta página.',
    explanationTitle: 'O que significa cada método de configuração',
    explanations: {
      cli_manual: '**Configuração pela linha de comando e manual**: use um comando gerado ou siga todas as etapas manuais.',
      manual: '**Configuração manual**: informe a API Key, a Base URL e o Model.',
      advanced: '**Configuração avançada**: instale o CC Switch e use um proxy local, conversão de protocolo ou mapeamento de modelos.',
      unsupported: '**Sem suporte**: ainda não há um método verificado de conexão direta.'
    },
    labels: {
      cli_manual: 'Linha de comando e configuração manual',
      manual: 'Configuração manual',
      recommended: 'Recomendado',
      supported: 'Compatível',
      advanced: 'Configuração avançada',
      unverified: 'Não verificado',
      unsupported: 'Sem suporte'
    }
  },
  ja: {
    directory: 'ja',
    advancedHeading: '## 高度な設定',
    heading: '対応プロバイダー',
    provider: 'プロバイダー',
    status: '対応状況',
    note: 'ここに示す対応状況は、このページで説明する BetterToken の設定方法に適用されます。',
    explanationTitle: '設定方法の説明',
    explanations: {
      cli_manual: '**コマンドライン + 手動設定**：生成されたコマンドを使うか、すべての手順を手動で設定します。',
      manual: '**手動設定**：API Key、Base URL、Model を入力します。',
      advanced: '**高度な設定**：CC Switch をインストールし、ローカルプロキシ、プロトコル変換、またはモデルマッピングを使用します。',
      unsupported: '**未対応**：検証済みの直接接続方法はまだありません。'
    },
    labels: {
      cli_manual: 'コマンドライン + 手動設定',
      manual: '手動設定',
      recommended: '推奨',
      supported: '対応',
      advanced: '高度な設定',
      unverified: '未検証',
      unsupported: '未対応'
    }
  },
  fr: {
    directory: 'fr',
    advancedHeading: '## Configuration avancée',
    heading: 'Fournisseurs compatibles',
    provider: 'Fournisseur',
    status: 'État',
    note: 'Les états concernent la méthode de configuration de BetterToken décrite sur cette page.',
    explanationTitle: 'Signification des méthodes de configuration',
    explanations: {
      cli_manual: '**Configuration en ligne de commande et manuelle** : utilisez une commande générée ou suivez toutes les étapes manuelles.',
      manual: '**Configuration manuelle** : saisissez l’API Key, la Base URL et le Model.',
      advanced: '**Configuration avancée** : installez CC Switch et utilisez un proxy local, une conversion de protocole ou un mappage de modèles.',
      unsupported: '**Non compatible** : aucune méthode de connexion directe vérifiée n’est disponible pour le moment.'
    },
    labels: {
      cli_manual: 'Ligne de commande et configuration manuelle',
      manual: 'Configuration manuelle',
      recommended: 'Recommandé',
      supported: 'Compatible',
      advanced: 'Configuration avancée',
      unverified: 'Non vérifié',
      unsupported: 'Non compatible'
    }
  },
  de: {
    directory: 'de',
    advancedHeading: '## Erweiterte Konfiguration',
    heading: 'Unterstützte Provider',
    provider: 'Provider',
    status: 'Status',
    note: 'Die Statusangaben gelten für die auf dieser Seite beschriebene BetterToken-Konfiguration.',
    explanationTitle: 'Bedeutung der Einrichtungsmethoden',
    explanations: {
      cli_manual: '**Befehlszeile + manuelle Konfiguration**: Nutze einen generierten Befehl oder führe alle manuellen Schritte aus.',
      manual: '**Manuelle Konfiguration**: Gib API Key, Base URL und Model ein.',
      advanced: '**Erweiterte Konfiguration**: Installiere CC Switch und nutze einen lokalen Proxy, Protokollkonvertierung oder Modellzuordnung.',
      unsupported: '**Nicht unterstützt**: Derzeit gibt es keine verifizierte Methode für die direkte Verbindung.'
    },
    labels: {
      cli_manual: 'Befehlszeile + manuelle Konfiguration',
      manual: 'Manuelle Konfiguration',
      recommended: 'Empfohlen',
      supported: 'Unterstützt',
      advanced: 'Erweiterte Konfiguration',
      unverified: 'Nicht verifiziert',
      unsupported: 'Nicht unterstützt'
    }
  },
  ko: {
    directory: 'ko',
    advancedHeading: '## 고급 설정',
    heading: '지원 Provider',
    provider: 'Provider',
    status: '상태',
    note: '표시된 상태는 이 페이지에서 설명하는 BetterToken 설정 방식에 적용됩니다.',
    explanationTitle: '설정 방식 설명',
    explanations: {
      cli_manual: '**명령줄 + 수동 설정**: 생성된 명령을 사용하거나 전체 수동 단계를 따르세요.',
      manual: '**수동 설정**: API Key, Base URL, Model을 입력하세요.',
      advanced: '**고급 설정**: CC Switch를 설치하고 로컬 프록시, 프로토콜 변환 또는 모델 매핑을 사용하세요.',
      unsupported: '**지원되지 않음**: 검증된 직접 연결 방식이 아직 없습니다.'
    },
    labels: {
      cli_manual: '명령줄 + 수동 설정',
      manual: '수동 설정',
      recommended: '권장',
      supported: '지원됨',
      advanced: '고급 설정',
      unverified: '검증되지 않음',
      unsupported: '지원되지 않음'
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
