#!/usr/bin/env node
// scripts/setup-gtm.js
// Creates a new GTM container via the Tag Manager API and prints the container ID.
// Requires: GOOGLE_OAUTH_CLIENT_ID, GOOGLE_OAUTH_CLIENT_SECRET, GOOGLE_OAUTH_REFRESH_TOKEN
// Usage: node --env-file=.env scripts/setup-gtm.js acme.com

const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN;
const siteName = process.env.SITE_NAME;
const domain = process.argv[2];

if (!clientId || !clientSecret || !refreshToken || !siteName) {
  console.error('Missing GOOGLE_OAUTH_* env vars or SITE_NAME. GTM setup skipped.');
  console.error('Set up GTM manually at tagmanager.google.com and add GTM_CONTAINER_ID to .env');
  process.exit(0); // non-fatal
}

const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
  method: 'POST',
  headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: 'refresh_token' }),
});
const { access_token } = await tokenRes.json();

const accountsRes = await fetch('https://www.googleapis.com/tagmanager/v2/accounts', {
  headers: { Authorization: `Bearer ${access_token}` },
});
const accounts = await accountsRes.json();
const accountId = accounts.account?.[0]?.accountId;
if (!accountId) { console.error('No GTM account found'); process.exit(1); }

const containerRes = await fetch(`https://www.googleapis.com/tagmanager/v2/accounts/${accountId}/containers`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${access_token}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({ name: siteName, usageContext: ['web'], domainName: domain ? [domain] : [] }),
});
const container = await containerRes.json();
const containerId = container.publicId;

console.log(`GTM container created: ${containerId}`);
console.log(`Add to .env: GTM_CONTAINER_ID=${containerId}`);
