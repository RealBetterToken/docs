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

Before enabling automation:

1. Add and verify the URL-prefix property `https://docs.bettertoken.ai/` in Google Search Console.
2. Enable the Google Search Console API in the Google Cloud project.
3. Create a service account for CI.
4. Add the service account email to the Search Console property with permission to submit sitemaps.
5. Grant the service account `Service Account Token Creator` on itself so the workflow can generate an access token.
6. Store the service account JSON in GitHub Actions secrets as `GOOGLE_SERVICE_ACCOUNT_JSON`.

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
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Wait for production docs deployment
        run: sleep 120

      - name: Authenticate with Google
        id: auth
        uses: google-github-actions/auth@v2
        with:
          credentials_json: ${{ secrets.GOOGLE_SERVICE_ACCOUNT_JSON }}
          token_format: access_token
          access_token_scopes: https://www.googleapis.com/auth/webmasters

      - name: Submit sitemap
        env:
          ACCESS_TOKEN: ${{ steps.auth.outputs.access_token }}
          SITE_URL: https://docs.bettertoken.ai/
          SITEMAP_URL: https://docs.bettertoken.ai/sitemap.xml
        run: |
          set -euo pipefail

          encoded_site_url="$(python3 -c 'import os, urllib.parse; print(urllib.parse.quote(os.environ["SITE_URL"], safe=""))')"
          encoded_sitemap_url="$(python3 -c 'import os, urllib.parse; print(urllib.parse.quote(os.environ["SITEMAP_URL"], safe=""))')"

          curl -sS --fail -X PUT \
            -H "Authorization: Bearer ${ACCESS_TOKEN}" \
            "https://www.googleapis.com/webmasters/v3/sites/${encoded_site_url}/sitemaps/${encoded_sitemap_url}"
```

If the deployment platform exposes a reliable deploy-success trigger, run this workflow after that event instead of relying on the fixed wait.

## Need help?

### Troubleshooting

- If your dev environment isn't running: Run `mint update` to ensure you have the most recent version of the CLI.
- If a page loads as a 404: Make sure you are running in a folder with a valid `docs.json`.

### Resources
- [Mintlify documentation](https://mintlify.com/docs)
