# LLMEasy 文档迁移到 BetterToken

状态：技术迁移已完成，等待提交 Google Search Console 地址更改
决策日期：2026-07-21
技术验收日期：2026-07-21

## 最终架构

- `docs.bettertoken.ai` 是唯一生产、SEO 和内容更新域名。
- `main` 是唯一内容源与 Mintlify 部署分支。
- 文档统一使用 BetterToken 名称、Logo 与域名，并沿用既有内容、主题、字体和三语言结构。
- 俄语为默认语言，英语使用 `/en`，中文使用 `/zh`。
- `docs.llmeasy.ru` 停止发布新内容，仅保留永久重定向。
- 不再生成或强制推送 `llmeasy-docs` 分支。

## 上线顺序

1. [x] 取消并移除 `docs.bettertoken.ai` → `docs.llmeasy.ru` 的旧重定向与 Worker Route。
2. [x] 从 `main` 发布 BetterToken，验证所有 Sitemap URL 返回 `200` 且 canonical 指向自身。
3. [x] 生成 LLMEasy → BetterToken 的逐 URL 映射。
4. [x] 在 LLMEasy 的代理或 DNS/CDN 层启用单跳 `301` 或 `308`。
5. [x] 验证旧 URL 只跳转一次，最终页面为 `200`，语言与内容对应。
6. [ ] 在 Google Search Console 从 `docs.llmeasy.ru` 提交地址更改到 `docs.bettertoken.ai`。
7. [x] 只提交 `https://docs.bettertoken.ai/sitemap.xml`。

2026-07-21 的完整验收结果：213 个 LLMEasy 旧 URL 均单跳到对应的 BetterToken URL；213 个目标页面均返回 `200` 且 canonical 指向自身。

## URL 映射

两个站点现在使用相同语言路径，因此迁移保持路径不变：

| LLMEasy 旧地址 | BetterToken 目标地址 |
| --- | --- |
| `/path` | `/path` |
| `/en/path` | `/en/path` |
| `/zh/path` | `/zh/path` |

历史 `/ru/path` 地址应直接跳到俄语默认地址 `/path`，不能先经过其他旧地址。

基础映射来自 LLMEasy 当前 Sitemap：

```bash
node scripts/generate-llmeasy-redirect-map.mjs
```

如果 Search Console 导出了 Sitemap 以外的已收录、有展示、点击或外链 URL，合并生成：

```bash
node scripts/generate-llmeasy-redirect-map.mjs \
  --additional-urls .github/migrations/llmeasy-to-bettertoken/gsc-indexed-urls.txt
```

输出：

- `.github/migrations/llmeasy-to-bettertoken/redirect-map.csv`
- `.github/migrations/llmeasy-to-bettertoken/cloudflare-bulk-redirects.csv`

`action=review` 的 URL 不进入 Cloudflare 导入文件。没有等价页面时返回 `404` 或 `410`，不要跳转到首页。

## 验收

目标站上线后先检查目标页面：

```bash
node scripts/check-llmeasy-migration.mjs
```

旧域名重定向启用后检查完整迁移：

```bash
node scripts/check-llmeasy-migration.mjs --expect-redirects
```

验收标准：

- BetterToken Sitemap 只包含 `docs.bettertoken.ai` 的规范 URL。
- 每个新页面返回 `200` 且 canonical 指向自身。
- Sitemap 为实际翻译关系输出 `ru`、`en`、`zh-CN` 和 `x-default`。
- 每个 LLMEasy 旧 URL 只有一次永久跳转。
- 不存在两个域名互相跳转或重定向链。
- `docs.llmeasy.ru` 保持可抓取，使搜索引擎可以看到永久重定向。

## Search Console 与保留期

- 保留两个域名和 Search Console 资源。
- 确认原 BetterToken → LLMEasy 地址更改已经取消。
- 仅在 BetterToken 目标页和 LLMEasy 反向重定向全部通过后，提交 LLMEasy → BetterToken 地址更改。
- LLMEasy 永久重定向至少保留一年；域名、DNS 和 TLS 在此期间不能下线。
- 监控旧域名索引下降、新域名索引与展示增长、404、soft 404 和 Google 选择的 canonical。

## 禁止操作

- 不同时启用两个方向的重定向。
- 不把所有旧 URL 统一跳到首页。
- 不用 `robots.txt` 或 `noindex` 阻止搜索引擎读取旧域名重定向。
- 不再提交 LLMEasy Sitemap。
- 不再恢复 `publish-llmeasy-docs.yml` 或 `submit-llmeasy-sitemap.yml`。
