#!/usr/bin/env node

import dns from 'node:dns/promises';
import https from 'node:https';

const domain = 'www.llmeasy.ru';
const requiredTxtNames = [
  `_cf-custom-hostname.${domain}`,
  `_acme-challenge.${domain}`,
];

const failures = [];

async function checkCnameOrA() {
  let cnameRecords = [];
  let aRecords = [];

  try {
    cnameRecords = await dns.resolveCname(domain);
  } catch (error) {
    if (error.code !== 'ENODATA' && error.code !== 'ENOTFOUND') {
      failures.push(`DNS CNAME lookup failed: ${error.message}`);
    }
  }

  try {
    aRecords = await dns.resolve4(domain);
  } catch (error) {
    if (error.code !== 'ENODATA' && error.code !== 'ENOTFOUND') {
      failures.push(`DNS A lookup failed: ${error.message}`);
    }
  }

  if (cnameRecords.length === 0) {
    failures.push(`${domain} has no CNAME record. Mintlify custom domains normally provide a CNAME target in the dashboard.`);
  }

  console.log(`CNAME: ${cnameRecords.join(', ') || '(none)'}`);
  console.log(`A: ${aRecords.join(', ') || '(none)'}`);
}

async function checkTxtRecords() {
  for (const name of requiredTxtNames) {
    try {
      const records = await dns.resolveTxt(name);
      const flattened = records.map((record) => record.join(''));
      console.log(`${name} TXT: ${flattened.join(', ') || '(none)'}`);

      if (flattened.length === 0) {
        failures.push(`${name} has no TXT records.`);
      }
    } catch (error) {
      if (error.code === 'ENODATA' || error.code === 'ENOTFOUND') {
        console.log(`${name} TXT: (none)`);
        failures.push(`${name} has no TXT records.`);
        continue;
      }

      failures.push(`${name} TXT lookup failed: ${error.message}`);
    }
  }
}

function checkHttps() {
  return new Promise((resolve) => {
    const request = https.request(
      {
        hostname: domain,
        method: 'HEAD',
        path: '/',
        timeout: 15000,
      },
      (response) => {
        console.log(`HTTPS: ${response.statusCode}`);

        if (!response.statusCode || response.statusCode >= 400) {
          failures.push(`HTTPS returned ${response.statusCode}.`);
        }

        response.resume();
        resolve();
      },
    );

    request.on('timeout', () => {
      request.destroy(new Error('HTTPS request timed out.'));
    });

    request.on('error', (error) => {
      console.log(`HTTPS: ${error.message}`);
      failures.push(`HTTPS check failed: ${error.message}`);
      resolve();
    });

    request.end();
  });
}

await checkCnameOrA();
await checkTxtRecords();
await checkHttps();

if (failures.length > 0) {
  console.error('\nLLMEasy domain check failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('\nLLMEasy domain check passed.');
