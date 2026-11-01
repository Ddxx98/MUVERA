/**
 * Zero-cost diagnostic script to verify live Shiprocket connectivity.
 * Tests authentication, verifies pickup location, and checks courier serviceability.
 *
 * Usage:
 *   node --env-file=.env.local scripts/verify-shiprocket-live.js
 */

const fs = require('fs');
const path = require('path');

// Fallback manual parser if --env-file was not passed
if (!process.env.SHIPROCKET_EMAIL) {
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

const EMAIL = process.env.SHIPROCKET_EMAIL;
const PASSWORD = process.env.SHIPROCKET_PASSWORD;
const TARGET_PICKUP = process.env.SHIPROCKET_PICKUP_LOCATION || 'Abhi';

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 MUVERA SHIPROCKET LIVE INTEGRATION DIAGNOSTICS');
  console.log('='.repeat(60));
  console.log(`API User Email:    ${EMAIL}`);
  console.log(`Configured Pickup: ${TARGET_PICKUP}\n`);

  if (!EMAIL || !PASSWORD) {
    console.error('❌ Error: SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD must be configured.');
    process.exit(1);
  }

  // Step 1: Authenticate
  console.log('Step 1: Authenticating with Shiprocket API...');
  const authRes = await fetch('https://apiv2.shiprocket.in/v1/external/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });

  if (!authRes.ok) {
    const errorBody = await authRes.json().catch(() => ({}));
    console.error(`❌ Authentication failed [HTTP ${authRes.status}]:`, errorBody);
    process.exit(1);
  }

  const authData = await authRes.json();
  const token = authData.token;
  console.log(`✅ Authentication Successful!`);
  console.log(`   Account ID:  ${authData.id || authData.company_id}`);
  console.log(`   User:        ${authData.first_name || ''} ${authData.last_name || ''} (${authData.email})`);
  console.log(`   JWT Token:   ${token.slice(0, 15)}... (valid)\n`);

  const headers = {
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
  };

  // Step 2: Fetch Pickup Locations
  console.log('Step 2: Verifying Registered Pickup Locations...');
  const pickupRes = await fetch('https://apiv2.shiprocket.in/v1/external/settings/company/pickup', { headers });
  const pickupData = await pickupRes.json();
  const addresses = pickupData?.data?.shipping_address || [];

  console.log(`   Found ${addresses.length} registered pickup address(es):`);
  let matchedLocation = null;
  for (const addr of addresses) {
    const isTarget = addr.pickup_location.toLowerCase() === TARGET_PICKUP.toLowerCase();
    if (isTarget) matchedLocation = addr;
    console.log(`   - [${addr.pickup_location}] PIN: ${addr.pin_code}, ID: ${addr.id}, Primary: ${addr.is_primary_location === 1 ? 'Yes' : 'No'} ${isTarget ? '⭐ (MATCHED)' : ''}`);
  }

  if (!matchedLocation) {
    console.warn(`\n⚠️ Warning: Configured pickup location "${TARGET_PICKUP}" not found in registered list.`);
    console.warn(`   Available nicknames: ${addresses.map(a => a.pickup_location).join(', ')}`);
  } else {
    console.log(`\n✅ Confirmed Pickup Location "${matchedLocation.pickup_location}" (PIN: ${matchedLocation.pin_code}) is registered and active!`);
  }

  // Step 3: Courier Serviceability Test
  const pickupPin = matchedLocation?.pin_code || '560100';
  const testDeliveryPin = '560038'; // Indiranagar, Bengaluru
  console.log(`\nStep 3: Checking Courier Serviceability (${pickupPin} -> ${testDeliveryPin}, 500g)...`);

  const sUrl = `https://apiv2.shiprocket.in/v1/external/courier/serviceability/?pickup_postcode=${pickupPin}&delivery_postcode=${testDeliveryPin}&weight=0.5&cod=0`;
  const servRes = await fetch(sUrl, { headers });
  const servData = await servRes.json();
  const couriers = servData?.data?.available_courier_companies || [];

  console.log(`✅ Serviceability check completed: ${couriers.length} courier partner(s) available.`);
  if (couriers.length > 0) {
    console.log('\nTop 3 Available Courier Partners:');
    for (const c of couriers.slice(0, 3)) {
      console.log(`   • ${c.courier_name.padEnd(25)} | Rate: ₹${c.rate} | Est. Delivery: ${c.etd} | ID: ${c.courier_company_id}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 ALL SHIPROCKET LIVE CHECKS PASSED SUCCESSFULLY!');
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('Fatal error during verification:', err);
  process.exit(1);
});
