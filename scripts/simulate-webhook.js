/**
 * Simulates a carrier webhook event against MUVERA's logistics webhook endpoint.
 *
 * Usage:
 *   node scripts/simulate-webhook.js [fixture_name]
 * Example:
 *   node scripts/simulate-webhook.js shiprocket-webhook-delivered.json
 */

const fs = require('fs');
const path = require('path');

// Load environment variables
if (!process.env.LOGISTICS_WEBHOOK_SECRET) {
  const envPath = path.resolve(process.cwd(), '.env.local');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const idx = trimmed.indexOf('=');
      if (idx !== -1) {
        const key = trimmed.slice(0, idx).trim();
        const val = trimmed.slice(idx + 1).trim();
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

const SECRET = process.env.LOGISTICS_WEBHOOK_SECRET || 'muvera_logistics_webhook_secret_32chars_2026';
const TARGET_URL = process.env.WEBHOOK_TARGET_URL || 'http://localhost:3000/api/webhooks/logistics';
const FIXTURE_NAME = process.argv[2] || 'shiprocket-webhook-delivered.json';

async function main() {
  console.log('='.repeat(65));
  console.log('📡 MUVERA INBOUND LOGISTICS WEBHOOK SIMULATOR');
  console.log('='.repeat(65));
  console.log(`Endpoint:    ${TARGET_URL}`);
  console.log(`Fixture:     ${FIXTURE_NAME}\n`);

  const fixturePath = path.resolve(process.cwd(), 'tests', 'fixtures', FIXTURE_NAME);
  if (!fs.existsSync(fixturePath)) {
    console.error(`❌ Fixture not found at: ${fixturePath}`);
    process.exit(1);
  }

  const payload = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
  console.log(`Payload details: AWB=${payload.awb}, Status="${payload.current_status}", Scans=${payload.scans?.length || 0}`);

  try {
    const res = await fetch(TARGET_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': SECRET,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.json().catch(() => ({}));
    console.log(`\nResponse Status: [HTTP ${res.status}]`);
    console.log('Response Body:  ', body);

    if (res.status === 200 && body.ok) {
      console.log('\n✅ Webhook successfully verified, ingested and queued for background processing!');
    } else {
      console.warn('\n⚠️ Webhook returned unexpected status.');
    }
  } catch (err) {
    if (err.cause?.code === 'ECONNREFUSED') {
      console.log('\nℹ️ Note: Local dev server is not currently running on port 3000.');
      console.log('   Run "npm run dev" in a separate terminal before executing this script.');
    } else {
      console.error('Error sending webhook:', err.message);
    }
  }
}

main().catch(console.error);
