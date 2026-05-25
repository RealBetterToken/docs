#!/usr/bin/env node

const apiKey = process.env.MINTLIFY_API_KEY;
const projectId = process.env.MINTLIFY_PROJECT_ID;
const shouldWait = !process.argv.includes('--no-wait');
const showHelp = process.argv.includes('--help') || process.argv.includes('-h');
const apiBaseUrl = 'https://api.mintlify.com/v1';

function usage() {
  console.log(`Usage:
  MINTLIFY_API_KEY=mint_xxx MINTLIFY_PROJECT_ID=project_xxx node scripts/trigger-mintlify-update.mjs
  MINTLIFY_API_KEY=mint_xxx MINTLIFY_PROJECT_ID=project_xxx node scripts/trigger-mintlify-update.mjs --no-wait

Environment:
  MINTLIFY_API_KEY     Admin API key from the Mintlify dashboard.
  MINTLIFY_PROJECT_ID  LLMEasy Mintlify project ID from the API keys page.
`);
}

function requireEnv(name, value) {
  if (!value) {
    console.error(`${name} is required. See --help for usage.`);
    process.exit(1);
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(options.headers ?? {}),
    },
  });
  const text = await response.text();
  let body = {};

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { message: text };
    }
  }

  if (!response.ok) {
    const details = body.error || body.message || text || response.statusText;
    throw new Error(`Mintlify API ${response.status} ${response.statusText}: ${details}`);
  }

  return body;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function pollStatus(statusId) {
  for (let attempt = 1; attempt <= 120; attempt += 1) {
    const status = await request(`/project/update-status/${encodeURIComponent(statusId)}`);
    const state = status.status ?? 'unknown';
    const summary = status.summary ? ` - ${status.summary}` : '';

    console.log(`Mintlify update ${state}${summary}`);

    if (state === 'success') {
      return status;
    }

    if (state === 'failure') {
      throw new Error(`Mintlify update failed${summary}`);
    }

    await sleep(5000);
  }

  throw new Error('Timed out waiting for Mintlify update to finish.');
}

if (showHelp) {
  usage();
  process.exit(0);
}

requireEnv('MINTLIFY_API_KEY', apiKey);
requireEnv('MINTLIFY_PROJECT_ID', projectId);

const result = await request(`/project/update/${encodeURIComponent(projectId)}`, {
  method: 'POST',
});

if (!result.statusId) {
  throw new Error('Mintlify API response did not include statusId.');
}

console.log(`Triggered Mintlify update: ${result.statusId}`);

if (shouldWait) {
  await pollStatus(result.statusId);
}
