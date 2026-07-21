# Documentation project instructions

## About this project

- This is the Mintlify documentation site for LLMEasy, published at `docs.bettertoken.ai`.
- Pages are MDX files with YAML frontmatter.
- Site-wide configuration lives in `docs.json`.
- Main audiences are Claude Code users, Codex users, and users of external AI coding tools.
- Run `mint dev` for local preview.
- Run `mint broken-links` for the fastest content validation pass.

## Workspace workflow preferences

- This documentation workspace is normally edited directly in `/Users/liuyi/BetterToken/docs`.
- Do not create a separate git worktree for routine documentation changes unless the user explicitly asks for one.
- When committing documentation updates, work from the current checkout and current branch unless the user requests a different branch strategy.

## Terminology

- Use `Claude Code` and `Codex CLI` as product names. Do not invent shortened names.
- Use `external tools` / `外部工具` for tools such as Cursor, Cline, Zed, Roo Code, OpenClaw, and similar clients.
- Use `Codex group` / `Codex 分组` for model-group wording tied to OpenAI-compatible tools.
- Use `model plaza` / `模型广场` when referring users to the model selection page.
- Use `Base URL` exactly in both Chinese and English pages when describing endpoints.
- Distinguish the two access modes clearly:
  - Claude Code / Anthropic protocol: `https://www.bettertoken.ai`
  - Codex / OpenAI-compatible protocol: `https://www.bettertoken.ai/v1`
- For Mintlify variables that should render as clickable external links, use explicit MDX anchors such as `<a href={"{{register-url}}"}>注册并获取</a>` or `<a href={"{{model-plaza-url}}"}>模型广场</a>`. Do not wrap the variable itself in backticks, and do not write parenthesized text such as `注册并获取 ({{register-url}})` or `模型广场 ({{model-plaza-url}})`, because Mintlify will substitute the URL but the page will display it as non-clickable text.

## Style preferences

- Use active voice and second person.
- Keep sentences concise. One idea per sentence when possible.
- Use sentence case for headings.
- Bold UI labels and important on-page actions.
- Use code formatting for commands, environment variables, file paths, endpoints, and model IDs.
- Prefer concrete setup guidance over marketing language.
- When documenting external-tool setup, tell readers which endpoint, auth field, and model group to use.
- Keep Chinese, English, and Russian pages aligned in meaning. Any user-facing documentation change should be synchronized across all three languages unless the user explicitly asks for one language only.

## User-facing documentation standard

- Write help docs for ordinary users who read the published website. Do not mention local preview behavior, implementation workarounds, internal mistakes, or the process used to fix a docs issue.
- If a technical workaround is necessary, present only the user-facing action and expected result. Do not expose internal file-serving details unless the user must act on them.
- Before finishing any docs change, reread the edited page from a first-time user’s perspective. Check for contradictions, over-explaining, implementation leakage, and wording that sounds like it explains an internal mistake.
- Prefer clear task guidance over defensive explanations. If a sentence does not help the user complete the setup or understand a real product limitation, remove it.

## Content boundaries

- Do not document internal admin features, hidden dashboards, or unpublished flows.
- Do not promise support for tools, models, or product capabilities that are not already present in the docs or confirmed by the user.
- Do not add analytics, telemetry, or tracking instructions unless explicitly requested.
- Do not expose secrets, keys, tokens, or private operational details.
- When behavior differs by protocol, document the difference explicitly instead of merging both flows into one generic setup.

## Search indexing and sitemap automation

- Do not use Google Indexing API for ordinary documentation pages. It is not the supported path for this docs site.
- Do not automate browser clicks on Google Search Console **Request indexing**. Use sitemap submission instead.
- `docs.bettertoken.ai` is the only SEO, acquisition, and production version of the documentation. Keep its production sitemap at `https://docs.bettertoken.ai/sitemap.xml`.
- Do not publish new documentation at `docs.llmeasy.ru` or submit its sitemap after the migration begins. Keep that host available only for permanent, route-specific redirects to BetterToken.
- Follow `.github/BETTERTOKEN_SEO_MIGRATION.md` for URL mapping, verification gates, Search Console steps, and the redirect retention period.
- For post-deploy automation, submit only the BetterToken sitemap through Google Search Console Sitemaps API after the production site is updated.
- Store Google credentials only in CI secrets such as `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `GOOGLE_OAUTH_REFRESH_TOKEN`. Never commit client secrets, refresh tokens, or access tokens.

## BetterToken production operations

- `main` is the only content and production branch. Russian pages live at the root, English pages under `/en`, and Chinese pages under `/zh`.
- The published product name, LLMEasy visual design, content, and navigation are preserved while the canonical documentation and product URLs use `bettertoken.ai`.
- Run `node scripts/prepare-bettertoken-artifacts.mjs` after content or navigation changes. It refreshes the hreflang Sitemap, `llms-full.txt`, Metrica SPA script, and IndexNow key file.
- BetterToken publishing uses `.github/workflows/publish-bettertoken-docs.yml`; search submission uses `.github/workflows/submit-bettertoken-sitemap.yml`.
- Mintlify permanent redirects intentionally return HTTP 308. Treat 301 and 308 as permanent redirects; do not add an Nginx layer only to change 308 into 301. Keep each old URL to one redirect hop, and verify the destination is `200` and self-canonical.
- `scripts/prepare-bettertoken-artifacts.mjs` generates a custom root `sitemap.xml` with reciprocal `ru`, `en`, `zh-CN`, and `x-default` alternates. Mintlify serves this file instead of its automatic Sitemap.
- Mintlify currently renders `lang="en"` in the server HTML for all routes and does not expose route-level `html lang` or `hreflang` configuration in `docs.json`. Record this as a platform limitation; do not add Nginx solely to rewrite HTML.
- Yandex indexing can lag after sitemap submission. Before changing content for an indexing issue, verify `https://docs.bettertoken.ai/robots.txt`, `https://docs.bettertoken.ai/sitemap.xml`, canonical URLs, and a YandexBot user-agent fetch.
- Historical operations note: on 2026-06-17, some Russian networks timed out when reaching Mintlify/Cloudflare for `docs.llmeasy.ru`, while `www.llmeasy.ru` on `67.230.182.168` stayed reachable. The access issue was confirmed fixed on 2026-06-24. Keep the note only as a recurrence runbook: verify DNS, TLS, regional probes, and current server routing before redeploying; do not assume a GitHub or Mintlify redeploy can fix regional network timeouts.

## Editing guidance

- Prefer updating an existing page over creating a new one when the topic already exists.
- Before changing wording patterns, search both Chinese and English docs for the same concept and keep usage consistent.
- For behavior changes in docs, update nearby examples, troubleshooting notes, and FAQ entries if needed.
- Use linear, monochrome sidebar icons for custom product pages. Custom SVG icons should use `currentColor` strokes and avoid filled brand colors so they match the rest of the navigation.
- Every page listed in the Coding Agent setup navigation group must include a frontmatter `icon`. Configuration-tool pages under Getting started, such as CC Switch, are not part of this requirement.
- Wrap screenshots in MDX with `<Frame>` and an inner `<img>` tag, including descriptive `alt` text and `style={{ borderRadius: '0.5rem' }}`. Follow the same pattern as `faq/claude-desktop-llmeasy-api.mdx`.
- Store screenshots and other page-specific images under a dedicated folder in `images/<page-slug>/`. Follow the same pattern as `images/quickstart/`.
- Use `images/temp/` only as a temporary holding area while collecting assets. Before finishing a docs change, move any referenced image into its final page-specific folder and update the MDX path.
- If a change affects links or navigation wording, run `mint broken-links` after editing.
