# LLMEasy 文档 SEO 迁移计划

状态：第一阶段执行中  
开始日期：2026-07-20

## 迁移决策

- LLMEasy 是文档自然搜索流量和新用户转化的唯一主品牌。
- BetterToken 已无需要继续服务的老用户，不再维护可索引的 BetterToken 文档副本。
- `docs.bettertoken.ai` 至少保留一年，仅用于把历史 URL 永久重定向到 LLMEasy 对应页面。
- 不使用 Google Search Console 的移除工具代替迁移，不通过 `robots.txt` 或 `noindex` 隐藏旧 URL。
- 永久重定向可以使用 `301` 或 `308`。当前架构优先保留 `308`，不为状态码增加额外代理层。

## 第一阶段：迁移搜索信号

第一阶段保持现有 LLMEasy 部署架构，避免同时进行域名迁移和源文件重构：

- `main` 暂时继续作为共享源分支。
- `llmeasy-docs` 暂时继续作为自动生成的 LLMEasy Mintlify 部署分支。
- 保留 `.github/workflows/publish-llmeasy-docs.yml`。
- 保留 `.github/workflows/submit-llmeasy-sitemap.yml`。
- 停止 BetterToken 文档自动发布。
- 停止 BetterToken Sitemap 自动提交。

### URL 数据源

重定向映射必须合并以下来源并去重：

1. BetterToken 当前线上 Sitemap。
2. Google Search Console 已编入索引 URL 导出。
3. Google Search Console 有展示、点击或外链的 URL。
4. 历史重定向和已改名页面。

2026-07-20 已导入 Search Console 的“有效网页”导出：73 个已编入索引 URL。去重后，完整映射包含 90 个旧 URL，其中 87 个有 LLMEasy 等价目标页，3 个已删除的影刀 AI Power 页面需要返回 `410`。

使用当前 Sitemap 生成基础映射：

```bash
node scripts/generate-bettertoken-redirect-map.mjs
```

重新生成包含 Search Console URL 的映射和 Cloudflare 导入文件：

```bash
node scripts/generate-bettertoken-redirect-map.mjs \
  --additional-urls .github/migrations/bettertoken-to-llmeasy/gsc-indexed-urls-2026-07-20.txt
```

输出文件：

- `redirect-map.csv`：完整审计表，包含来源和目标页校验状态。
- `cloudflare-bulk-redirects.csv`：可直接导入 Cloudflare 的 87 条 `308`，无表头并保留查询参数。

`action=review` 的条目不会进入 Cloudflare 导入文件。当前 3 条均为已经下线且没有等价内容的影刀 AI Power 页面，应返回 `410`，不能跳到首页或不相关的快速接入页。

### Cloudflare 上线步骤

1. 确认 `docs.bettertoken.ai` 在 Cloudflare DNS 中保持代理状态，否则 Bulk Redirects 不会生效。
2. 进入账号或 Zone 的 **Bulk Redirects**，创建名为 `bettertoken-docs-to-llmeasy` 的列表。
3. 导入 `.github/migrations/bettertoken-to-llmeasy/cloudflare-bulk-redirects.csv`。CSV 不含表头。
4. 创建并启用引用该列表的 Bulk Redirect Rule。仅导入列表不会自动启用重定向。
5. 对三个影刀旧路径通过 Cloudflare Worker 返回 `410`。使用 `.github/migrations/bettertoken-to-llmeasy/cloudflare-gone-worker.js`，并将 Worker Route 设置为 `docs.bettertoken.ai/*`。Worker 对其他未匹配路径继续请求原站，不增加跳到 LLMEasy 首页的兜底规则。
6. 确认旧域名的 Search Console 所有权使用 DNS 验证，避免 `410` 影响 HTML 验证文件。

批量检查 LLMEasy 目标页为 `200` 且 canonical 指向自身：

```bash
node scripts/check-bettertoken-migration.mjs
```

重定向启用后，检查每个旧 URL 只有一次 `301/308`，并直接到达映射目标：

```bash
node scripts/check-bettertoken-migration.mjs --expect-redirects
```

### 语言映射

BetterToken 默认语言是中文，LLMEasy 默认语言是俄语，不能直接按原路径通配：

| BetterToken 旧路径 | LLMEasy 目标路径 |
| --- | --- |
| `/path` | `/zh/path` |
| `/en/path` | `/en/path` |
| `/ru/path` | `/path` |

每个旧 URL 必须直接指向最终规范地址。若 LLMEasy 内部已经存在历史路径重定向，应在映射表中展开到最终地址，避免重定向链。

### 重定向验收标准

对映射表中的每个 URL 验证：

- 旧 URL 只发生一次永久跳转。
- 跳转状态为 `301` 或 `308`。
- 最终 LLMEasy URL 返回 `200`。
- 最终页面的 canonical 指向自身。
- 最终页面语言与旧页面语言一致。
- 不把多个无关页面统一跳转到首页。
- LLMEasy Sitemap 只包含 LLMEasy 自身的规范 URL。
- BetterToken 旧域名不被 `robots.txt` 阻止抓取，以便 Google 看到重定向。

### Search Console 操作

重定向上线并通过批量验证后：

1. 确认 `docs.bettertoken.ai` 和 `docs.llmeasy.ru` 的 Search Console 所有权仍有效。
2. 在 BetterToken 属性中提交 Change of Address，目标选择 LLMEasy。
3. 在 LLMEasy 属性中保留 `https://docs.llmeasy.ru/sitemap.xml`。
4. 对少量最高流量的 LLMEasy 目标页使用 URL 检查确认 Google 看到新的 canonical 和重定向来源。
5. 监控旧域名索引下降、新域名索引和展示增长、404、soft 404 与 Google 选择的 canonical。

### 第一阶段完成条件

- BetterToken 发布和 Sitemap 自动提交已停止。
- 已收录和有流量的 BetterToken URL 全部进入映射表。
- 所有映射通过单跳、状态码、最终 `200`、语言和 canonical 检查。
- BetterToken 域名开始提供永久重定向。
- Search Console Change of Address 已提交。
- LLMEasy Sitemap 提交保持成功。

## 第二阶段：简化为单一 LLMEasy 分支

第二阶段只在第一阶段重定向稳定后进行：

1. 将 `main` 改为 LLMEasy 原生内容源，不再通过 BetterToken 品牌替换生成 LLMEasy。
2. 将俄语内容放在根路径，英语保留 `/en`，中文保留 `/zh`。
3. 在 Mintlify **Git Settings** 中把 LLMEasy 部署分支从 `llmeasy-docs` 改为 `main`。
4. 验证 `main` 可以直接生成正确的 Logo、favicon、Base URL、canonical、Sitemap、Metrica 和多语言导航。
5. 停止生成和强制推送 `llmeasy-docs`。
6. 验证生产部署后删除无用的生成逻辑和分支。

### 第二阶段完成条件

- `main` 是唯一内容源和 LLMEasy 部署分支。
- Mintlify 生产项目直接读取 `main`。
- `llmeasy-docs` 不再被任何 Workflow 或 Mintlify 项目引用。
- BetterToken 旧域名继续独立提供永久重定向。

## 禁止操作

- 不在重定向生效前删除 BetterToken 域名、DNS、TLS 或 Search Console 属性。
- 不把 BetterToken URL 全部跳转到 LLMEasy 首页。
- 不在旧 URL 上先加 `noindex` 再做重定向。
- 不把 BetterToken 与 LLMEasy 互相设置 canonical。
- 不把两个品牌当作 `hreflang` 语言版本。
- 第一阶段不删除 `llmeasy-docs` 分支。
