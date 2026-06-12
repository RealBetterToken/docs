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

This repository keeps the shared documentation source for BetterToken and LLMEasy. The default `docs.json` publishes the BetterToken documentation. The regional `docs.llmeasy.json` publishes the LLMEasy documentation with the `LLMEasy` name, logo, canonical documentation URL for `https://docs.llmeasy.ru`, and product/API Base URL values for `https://www.llmeasy.ru`.

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

## Publishing changes

Install our GitHub app from your [dashboard](https://dashboard.mintlify.com/settings/organization/github-app) to propagate changes from your repo to your deployment. Changes are deployed to production automatically after pushing to the default branch.

## Google Search Console sitemap submission

Google does not provide an official API to automatically request indexing for ordinary documentation pages one URL at a time. For this docs site, use the supported flow instead:

1. Publish the docs update.
2. Let Mintlify update `https://docs.bettertoken.ai/sitemap.xml`.
3. Keep `https://docs.bettertoken.ai/robots.txt` pointing to that sitemap.
4. Submit the sitemap to Google Search Console after production deploys.

The production site already exposes:

```txt
https://docs.bettertoken.ai/sitemap.xml
https://docs.bettertoken.ai/robots.txt
```

The LLMEasy documentation site exposes:

```txt
https://docs.llmeasy.ru/sitemap.xml
https://docs.llmeasy.ru/robots.txt
```

Before enabling automation:

1. Add and verify the URL-prefix property `https://docs.bettertoken.ai/` in Google Search Console.
2. Enable the Google Search Console API in the Google Cloud project.
3. Create an OAuth client for CI.
4. Authorize the OAuth client with a Google account that is a verified owner of `https://docs.bettertoken.ai/`.
5. Store the OAuth credentials in GitHub Actions secrets as `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `GOOGLE_OAUTH_REFRESH_TOKEN`.

For LLMEasy, verify the domain property `llmeasy.ru` in Google Search Console and submit `https://docs.llmeasy.ru/sitemap.xml` with `SITE_URL=sc-domain:llmeasy.ru`. The workflow `.github/workflows/submit-llmeasy-sitemap.yml` handles that submission with the same OAuth secrets.

For Yandex, add the LLMEasy site in Yandex Webmaster and submit `https://docs.llmeasy.ru/sitemap.xml` once in the dashboard. After that, `.github/workflows/submit-llmeasy-sitemap.yml` also runs `node scripts/submit-indexnow.mjs` after each successful LLMEasy publish, reads the live sitemap, and attempts a best-effort IndexNow notification. The workflow keeps Google sitemap submission green even if IndexNow rejects the key file; switch off `INDEXNOW_BEST_EFFORT` only after the custom domain can serve a root-level `.txt` key file. To test the script without notifying search engines, run:

```bash
node scripts/submit-indexnow.mjs --dry-run
```

Use this workflow as `.github/workflows/submit-google-sitemap.yml`:

```yaml
name: Submit Google sitemap

on:
  workflow_dispatch:
  push:
    branches:
      - main
    paths:
      - "**/*.mdx"
      - "docs.json"
      - "images/**"
      - "snippets/**"
  schedule:
    - cron: "15 2 * * 1"

permissions:
  contents: read

jobs:
  submit-sitemap:
    runs-on: ubuntu-latest

    steps:
      - name: Wait for production docs deployment
        run: sleep 120

      - name: Submit sitemap
        env:
          GOOGLE_OAUTH_CLIENT_ID: ${{ secrets.GOOGLE_OAUTH_CLIENT_ID }}
          GOOGLE_OAUTH_CLIENT_SECRET: ${{ secrets.GOOGLE_OAUTH_CLIENT_SECRET }}
          GOOGLE_OAUTH_REFRESH_TOKEN: ${{ secrets.GOOGLE_OAUTH_REFRESH_TOKEN }}
          SITE_URL: https://docs.bettertoken.ai/
          SITEMAP_URL: https://docs.bettertoken.ai/sitemap.xml
        run: |
          set -euo pipefail

          python3 - <<'PY'
          import json
          import os
          import urllib.parse
          import urllib.request

          token_payload = urllib.parse.urlencode(
              {
                  "client_id": os.environ["GOOGLE_OAUTH_CLIENT_ID"],
                  "client_secret": os.environ["GOOGLE_OAUTH_CLIENT_SECRET"],
                  "refresh_token": os.environ["GOOGLE_OAUTH_REFRESH_TOKEN"],
                  "grant_type": "refresh_token",
              }
          ).encode()
          token_request = urllib.request.Request(
              "https://oauth2.googleapis.com/token",
              data=token_payload,
              method="POST",
          )
          with urllib.request.urlopen(token_request) as response:
              token_response = json.loads(response.read())

          access_token = token_response["access_token"]

          encoded_site_url = urllib.parse.quote(os.environ["SITE_URL"], safe="")
          encoded_sitemap_url = urllib.parse.quote(os.environ["SITEMAP_URL"], safe="")
          endpoint = (
              "https://www.googleapis.com/webmasters/v3/sites/"
              f"{encoded_site_url}/sitemaps/{encoded_sitemap_url}"
          )

          request = urllib.request.Request(
              endpoint,
              method="PUT",
              headers={"Authorization": f"Bearer {access_token}"},
          )

          with urllib.request.urlopen(request) as response:
              response.read()
          PY
```

If the deployment platform exposes a reliable deploy-success trigger, run this workflow after that event instead of relying on the fixed wait.

## Need help?

### Troubleshooting

- If your dev environment isn't running: Run `mint update` to ensure you have the most recent version of the CLI.
- If a page loads as a 404: Make sure you are running in a folder with a valid `docs.json`.

### Resources
- [Mintlify documentation](https://mintlify.com/docs)
