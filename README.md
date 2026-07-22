# BetterToken documentation

Mintlify documentation for BetterToken, published at `https://docs.bettertoken.ai`.

## Production structure

- Source and production branch: `main`
- Default language: Russian at `/`
- English: `/en`
- Chinese: `/zh`
- Product name: BetterToken
- Visual design: existing green BetterToken documentation theme
- Canonical documentation domain: `docs.bettertoken.ai`
- Product and API domain: `bettertoken.ai`

`docs.llmeasy.ru` is retired as a publishing target. During the SEO migration it remains online only to permanently redirect each old URL to the corresponding BetterToken URL. See [`.github/BETTERTOKEN_SEO_MIGRATION.md`](.github/BETTERTOKEN_SEO_MIGRATION.md).

## Local validation

Install the Mintlify CLI, then refresh generated search artifacts and validate the site:

```bash
npm install -g mint
node scripts/prepare-bettertoken-artifacts.mjs
node scripts/check-docs-seo.mjs
node scripts/check-bettertoken-sitemap.mjs
node scripts/check-bettertoken-metrica-spa.mjs
mint broken-links
mint validate
```

Run a local preview with:

```bash
mint dev
```

## Publishing

`.github/workflows/publish-bettertoken-docs.yml` validates `main` and refreshes generated artifacts when necessary. The Mintlify GitHub App deploys the same `main` push to production.

The Mintlify project must use repository `RealBetterToken/docs`, branch `main`, project root `/`, and custom domain `docs.bettertoken.ai`.

The current Mintlify plan does not allow Admin API deployment triggers. Keep the GitHub App connected to the BetterToken Mintlify account and repository; do not treat an API plan restriction as a successful deployment.

## Search submission

`.github/workflows/submit-bettertoken-sitemap.yml` runs after a successful production publish. It verifies live redirects, canonical URLs, hreflang entries, and Sitemap URLs before submitting:

```text
https://docs.bettertoken.ai/sitemap.xml
```

Google OAuth credentials stay in the repository secrets `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `GOOGLE_OAUTH_REFRESH_TOKEN`. The same workflow sends a best-effort IndexNow notification for Yandex and other participating engines.

Do not use the Google Indexing API or browser automation to request indexing for ordinary documentation pages.

## Migration checks

Generate the LLMEasy-to-BetterToken redirect map:

```bash
node scripts/generate-llmeasy-redirect-map.mjs
```

Validate BetterToken targets before enabling old-domain redirects:

```bash
node scripts/check-llmeasy-migration.mjs
```

After the redirects are enabled:

```bash
node scripts/check-llmeasy-migration.mjs --expect-redirects
```
