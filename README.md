# Mintlify Starter Kit

Use the starter kit to get your docs deployed and ready to customize.

Click the green **Use this template** button at the top of this repo to copy the Mintlify starter kit. The starter kit contains examples with

- Guide pages
- Navigation
- Customizations
- API reference pages
- Use of popular components

**[Follow the full quickstart guide](https://starter.mintlify.com/quickstart)**

## AI-assisted writing

Set up your AI coding tool to work with Mintlify:

```bash
npx skills add https://mintlify.com/docs
```

This command installs Mintlify's documentation skill for your configured AI tools like Claude Code, Cursor, Windsurf, and others. The skill includes component reference, writing standards, and workflow guidance.

See the [AI tools guides](/ai-tools) for tool-specific setup.

## Development

Install the [Mintlify CLI](https://www.npmjs.com/package/mint) to preview your documentation changes locally. To install, use the following command:

```
npm i -g mint
```

Run the following command at the root of your documentation, where your `docs.json` is located:

```
mint dev
```

View your local preview at `http://localhost:3000`.

## LLMEasy regional deployment

LLMEasy is now the only SEO and acquisition version of this documentation. During migration stage one, this repository temporarily keeps the existing shared source and generated deployment architecture: `main` remains the source branch, and `llmeasy-docs` remains the generated LLMEasy Mintlify deployment branch. BetterToken publishing and Sitemap submission are retired.

The full migration plan, URL language mapping, verification gates, and stage-two branch consolidation are recorded in [`.github/LLMEASY_SEO_MIGRATION.md`](.github/LLMEASY_SEO_MIGRATION.md).

The regional `docs.llmeasy.json` publishes the LLMEasy documentation with the `LLMEasy` name, logo, canonical documentation URL for `https://docs.llmeasy.ru`, and product/API Base URL values for `https://www.llmeasy.ru`.

Prepare the LLMEasy deployment root before publishing or validating that regional site:

```bash
node scripts/prepare-llmeasy-deployment.mjs
node scripts/audit-regional-docs.mjs
cd .mintlify-llmeasy
mint broken-links
mint validate
```

Use `.mintlify-llmeasy` as the Mintlify project root, or publish that generated directory through a deployment branch or CI artifact. In the Mintlify dashboard, create a separate deployment for LLMEasy and set the custom domain to `docs.llmeasy.ru`. Follow the DNS record shown by Mintlify for that deployment.

When content changes, update the shared MDX source first, then run the prepare script again so the LLMEasy deployment receives the latest pages with `docs.llmeasy.json` promoted to `docs.json`.

The prepare script also creates a custom `llms-full.txt` in the generated deployment root. Mintlify serves that file instead of an automatically generated `llms-full.txt`, which keeps the LLMEasy AI-readable bundle aligned with the regional branch.

The prepare script also creates the IndexNow verification key file in the generated deployment root. The key file uses a `.json` extension so Mintlify serves it on all plans, but its file body is still only the IndexNow key value. Keep that file in the LLMEasy deployment output only, because it proves ownership for `docs.llmeasy.ru` when search engines receive IndexNow updates.

The prepare script also copies `favicon-llmeasy.ico` to a root-level `favicon.ico` in the generated deployment and rewrites the generated `docs.json` favicon path to `/favicon.ico`. Keep this behavior in place for LLMEasy, because Yandex Webmaster checks the standard root favicon path.

The workflow `.github/workflows/publish-llmeasy-docs.yml` prepares, audits, validates, and publishes the generated LLMEasy site to the `llmeasy-docs` branch after changes land on `main`. Configure the LLMEasy Mintlify project to use:

- Repository: this repository
- Branch: `llmeasy-docs`
- Project root: `/`
- Custom domain: `docs.llmeasy.ru`

The Mintlify API can trigger an update for an existing project, but it does not replace the dashboard steps for creating the LLMEasy deployment or adding the custom domain. After the LLMEasy project exists, copy its project ID from the Mintlify API keys page and trigger a rebuild with:

```bash
export MINTLIFY_API_KEY="mint_xxx"
export MINTLIFY_PROJECT_ID="project_xxx"
node scripts/trigger-mintlify-update.mjs
```

To trigger Mintlify automatically from GitHub Actions after the `llmeasy-docs` branch is published, add both values as repository secrets named `MINTLIFY_API_KEY` and `MINTLIFY_PROJECT_ID`. If either secret is missing, the workflow still publishes the branch and skips the Mintlify API update.

After adding `docs.llmeasy.ru` in the Mintlify dashboard, add any verification `TXT` records that Mintlify shows for that domain. Wait until the records are verified in the dashboard, then point the domain to Mintlify with the `CNAME` record shown by Mintlify. Do not switch the `CNAME` before the verification records pass, because TLS provisioning depends on those records.

After the Mintlify dashboard and DNS records are configured, verify the public domain:

```bash
node scripts/check-llmeasy-domain.mjs
```

### LLMEasy Russia reachability runbook

Status: resolved as of 2026-06-24, based on user and operations confirmation. Keep this section as a recurrence runbook.

If users in Russia report that `https://docs.llmeasy.ru/` is unreachable while `https://www.llmeasy.ru/` still works, first compare DNS and HTTP reachability for both hosts:

```bash
dig +short docs.llmeasy.ru
dig +short www.llmeasy.ru
curl -I https://docs.llmeasy.ru/
curl -I https://www.llmeasy.ru/
```

Historical issue observed on 2026-06-17: some Russian routes timed out when `docs.llmeasy.ru` reached the Mintlify/Cloudflare edge, even when DNS pointed directly to `104.18.2.204` and `104.18.3.204`. The main site `www.llmeasy.ru` on `67.230.182.168` stayed reachable.

If the issue recurs and DNS checks show that `docs.llmeasy.ru` is again routed through an edge unavailable to some Russian users, compare the current fixed DNS, TLS, and proxy setup before changing records. Without confirmed server configuration, forcing `docs.llmeasy.ru` to `67.230.182.168` can fail at TLS/SNI or return an empty HTTP response.

## Publishing changes

Install our GitHub app from your [dashboard](https://dashboard.mintlify.com/settings/organization/github-app) to propagate changes from your repo to your deployment. Changes are deployed to production automatically after pushing to the default branch.

## Google Search Console sitemap submission

Google does not provide an official API to automatically request indexing for ordinary documentation pages one URL at a time. For this docs site, use the supported flow instead:

1. Publish the LLMEasy docs update.
2. Verify that production serves the expected canonical URLs and Sitemap.
3. Keep `https://docs.llmeasy.ru/robots.txt` pointing to the LLMEasy Sitemap.
4. Submit only the LLMEasy Sitemap to Google Search Console after production deploys.

The production documentation site exposes:

```txt
https://docs.llmeasy.ru/sitemap.xml
https://docs.llmeasy.ru/robots.txt
```

Verify the domain property `llmeasy.ru` in Google Search Console and submit `https://docs.llmeasy.ru/sitemap.xml` with `SITE_URL=sc-domain:llmeasy.ru`. The workflow `.github/workflows/submit-llmeasy-sitemap.yml` handles that submission with OAuth credentials stored in `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `GOOGLE_OAUTH_REFRESH_TOKEN` secrets.

Do not submit the BetterToken Sitemap again. Keep the BetterToken Search Console property and domain available while its historical URLs permanently redirect to LLMEasy. After all redirects pass validation, use Search Console Change of Address as described in [the migration plan](.github/LLMEASY_SEO_MIGRATION.md).

For Yandex, add the LLMEasy site in Yandex Webmaster and submit `https://docs.llmeasy.ru/sitemap.xml` once in the dashboard. After that, `.github/workflows/submit-llmeasy-sitemap.yml` also runs `node scripts/submit-indexnow.mjs` after each successful LLMEasy publish, reads the live sitemap, and attempts a best-effort IndexNow notification. The workflow keeps Google sitemap submission green even if IndexNow rejects the key file; switch off `INDEXNOW_BEST_EFFORT` only after the custom domain can serve a root-level `.txt` key file. To test the script without notifying search engines, run:

```bash
node scripts/submit-indexnow.mjs --dry-run
```

Yandex can take time to show a newly submitted site in search results. When checking an indexing issue, verify that the public site is crawlable before changing content:

```bash
curl -I https://docs.llmeasy.ru/robots.txt
curl -I https://docs.llmeasy.ru/sitemap.xml
curl -A "Mozilla/5.0 (compatible; YandexBot/3.0; +http://yandex.com/bots)" -I https://docs.llmeasy.ru/
```

The LLMEasy Sitemap workflow runs after a successful LLMEasy publish and also supports a scheduled refresh. Keep its live SEO verification step enabled so a deployment with broken redirects or canonical URLs cannot silently submit an invalid Sitemap.

## Need help?

### Troubleshooting

- If your dev environment isn't running: Run `mint update` to ensure you have the most recent version of the CLI.
- If a page loads as a 404: Make sure you are running in a folder with a valid `docs.json`.

### Resources
- [Mintlify documentation](https://mintlify.com/docs)
