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

当前待补充资料：BetterToken 已编入索引 URL 的 `.xlsx`、`.csv` 或纯文本列表。

使用当前 Sitemap 生成基础映射：

```bash
node scripts/generate-bettertoken-redirect-map.mjs
```

将 Search Console 导出转换为 CSV 或纯文本后合并：

```bash
node scripts/generate-bettertoken-redirect-map.mjs \
  --additional-urls /path/to/gsc-export.csv
```

输出文件为 `.github/migrations/bettertoken-to-llmeasy/redirect-map.csv`。`action=review` 的条目不能自动上线，必须确认等价目标页或明确返回 `404/410`。

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
