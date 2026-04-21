# Documentation project instructions

## About this project

- This is the Mintlify documentation site for BetterToken.
- Pages are MDX files with YAML frontmatter.
- Site-wide configuration lives in `docs.json`.
- Main audiences are Claude Code users, Codex users, and users of external AI coding tools.
- Run `mint dev` for local preview.
- Run `mint broken-links` for the fastest content validation pass.

## Terminology

- Use `Claude Code` and `Codex CLI` as product names. Do not invent shortened names.
- Use `external tools` / `外部工具` for tools such as Cursor, Cline, Zed, Roo Code, OpenClaw, and similar clients.
- Use `Codex group` / `Codex 分组` for model-group wording tied to OpenAI-compatible tools.
- Use `model plaza` / `模型广场` when referring users to the model selection page.
- Use `Base URL` exactly in both Chinese and English pages when describing endpoints.
- Distinguish the two access modes clearly:
  - Claude Code / Anthropic protocol: `https://www.bettertoken.ai`
  - Codex / OpenAI-compatible protocol: `https://www.bettertoken.ai/v1`

## Style preferences

- Use active voice and second person.
- Keep sentences concise. One idea per sentence when possible.
- Use sentence case for headings.
- Bold UI labels and important on-page actions.
- Use code formatting for commands, environment variables, file paths, endpoints, and model IDs.
- Prefer concrete setup guidance over marketing language.
- When documenting external-tool setup, tell readers which endpoint, auth field, and model group to use.
- Keep Chinese and English pages aligned in meaning. Do not let one language drift from the other on protocol, endpoint, or model guidance.

## Content boundaries

- Do not document internal admin features, hidden dashboards, or unpublished flows.
- Do not promise support for tools, models, or product capabilities that are not already present in the docs or confirmed by the user.
- Do not add analytics, telemetry, or tracking instructions unless explicitly requested.
- Do not expose secrets, keys, tokens, or private operational details.
- When behavior differs by protocol, document the difference explicitly instead of merging both flows into one generic setup.

## Editing guidance

- Prefer updating an existing page over creating a new one when the topic already exists.
- Before changing wording patterns, search both Chinese and English docs for the same concept and keep usage consistent.
- For behavior changes in docs, update nearby examples, troubleshooting notes, and FAQ entries if needed.
- Store screenshots and other page-specific images under a dedicated folder in `images/<page-slug>/`. Follow the same pattern as `images/quickstart/`.
- Use `images/temp/` only as a temporary holding area while collecting assets. Before finishing a docs change, move any referenced image into its final page-specific folder and update the MDX path.
- If a change affects links or navigation wording, run `mint broken-links` after editing.
