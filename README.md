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
3. Create an OAuth client for CI.
4. Authorize the OAuth client with a Google account that is a verified owner of `https://docs.bettertoken.ai/`.
5. Store the OAuth credentials in GitHub Actions secrets as `GOOGLE_OAUTH_CLIENT_ID`, `GOOGLE_OAUTH_CLIENT_SECRET`, and `GOOGLE_OAUTH_REFRESH_TOKEN`.

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
