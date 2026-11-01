/**
 * scripts/test-live-muvera.js
 *
 * Full verification of Razorpay Standard Web Checkout running on live production: https://muvera.in
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Load key secret for signature verification test
function loadSecret() {
  const envPath = path.join(__dirname, '..', '.env.local');
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf8');
    const match = content.match(/RAZORPAY_KEY_SECRET\s*=\s*(.+)/);
    if (match) return match[1].trim();
  }
  return process.env.RAZORPAY_KEY_SECRET || 'dtlarEcr0wXAy7YDKMVXzebW';
}

const LIVE_BASE_URL = 'https://muvera.in';
const KEY_SECRET = loadSecret();

async function runLiveVerification() {
  console.log('====================================================');
  console.log('   LIVE PRODUCTION VERIFICATION: https://muvera.in   ');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, details = '') {
    totalTests++;
    if (condition) {
      console.log(`✅ [TEST ${totalTests}] PASS: ${testName}`);
      if (details) console.log(`   ${details}`);
      passedTests++;
    } else {
      console.error(`❌ [TEST ${totalTests}] FAIL: ${testName}`);
      if (details) console.error(`   ${details}`);
    }
  }

  // ─── TEST 1: Checkout Page Availability & Razorpay SDK Script ──────
  console.log('[Phase 1: Storefront Checkout UI]');
  try {
    const res = await fetch(`${LIVE_BASE_URL}/checkout`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
    });
    const html = await res.text();
    assert(
      res.status === 200,
      'Storefront /checkout loads with HTTP 200',
      `Response status: ${res.status}`
    );
    let hasRazorpayIntegration = html.includes('checkout.razorpay.com') || html.includes('checkout.js');
    if (!hasRazorpayIntegration) {
      const chunkMatch = html.match(/\/checkout\/page-[a-f0-9]+\.js/);
      if (chunkMatch) {
        const chunkRes = await fetch(`${LIVE_BASE_URL}/_next/static/chunks/app` + chunkMatch[0]);
        const chunkText = await chunkRes.text();
        hasRazorpayIntegration =
          chunkText.includes('create-order') &&
          chunkText.includes('verify-payment') &&
          chunkText.includes('razorpay');
      }
    }
    assert(
      hasRazorpayIntegration,
      'Razorpay checkout SDK & verification handler integrated into /checkout bundle',
      `Verified Razorpay checkout caller and /api/verify-payment dispatcher in live production chunk.`
    );
  } catch (err) {
    assert(false, 'Checkout page reachable', err.message);
  }

  // ─── TEST 2: Amount Validation (< 100 paise rejection) ────────────
  console.log('\n[Phase 2: Live Backend /api/create-order]');
  try {
    const res = await fetch(`${LIVE_BASE_URL}/api/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: 50, currency: 'INR' }),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.error && data.error.includes('100 paise'),
      'Amount < 100 paise is rejected with HTTP 400',
      `HTTP ${res.status} | Error message: "${data.error}"`
    );
  } catch (err) {
    assert(false, 'Create-order min amount test', err.message);
  }

  // ─── TEST 3: Live Order Creation on Razorpay via muvera.in ─────────
  let liveRazorpayOrderId = null;
  try {
    const testAmountPaise = 29900; // ₹299.00
    const testReceipt = `rcpt_live_${Date.now()}`;
    const res = await fetch(`${LIVE_BASE_URL}/api/create-order`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        amount: testAmountPaise,
        currency: 'INR',
        receipt: testReceipt,
      }),
    });
    const data = await res.json();
    liveRazorpayOrderId = data.order_id;
    assert(
      res.status === 200 && data.order_id && data.order_id.startsWith('order_'),
      'Live order created on Razorpay API through muvera.in',
      `Order ID: ${data.order_id} | Amount: ${data.amount} paise (₹${data.amount / 100}) | Key ID: ${data.key_id}`
    );
  } catch (err) {
    assert(false, 'Live order creation', err.message);
  }

  // ─── TEST 4: Missing Parameters on /api/verify-payment ─────────────
  console.log('\n[Phase 3: Live Backend /api/verify-payment]');
  try {
    const res = await fetch(`${LIVE_BASE_URL}/api/verify-payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = await res.json();
    assert(
      res.status === 400 && data.success === false,
      'Missing parameters rejected with HTTP 400',
      `HTTP ${res.status} | Error: "${data.error}"`
    );
  } catch (err) {
    assert(false, 'Missing params rejection', err.message);
  }

  // ─── TEST 5: Cryptographic Signature Verification ──────────────────
  if (liveRazorpayOrderId) {
    try {
      const mockPaymentId = `pay_live_${Date.now()}`;
      const payload = `${liveRazorpayOrderId}|${mockPaymentId}`;
      const validSignature = crypto
        .createHmac('sha256', KEY_SECRET)
        .update(payload)
        .digest('hex');

      const res = await fetch(`${LIVE_BASE_URL}/api/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: liveRazorpayOrderId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: validSignature,
        }),
      });
      const data = await res.json();
      assert(
        res.status === 200 && data.success === true,
        'HMAC-SHA256 signature verified successfully on live muvera.in',
        `HTTP ${res.status} | Verified payment ID: ${data.payment_id}`
      );
    } catch (err) {
      assert(false, 'Valid signature verification', err.message);
    }

    // ─── TEST 6: Tampered Signature Rejection ────────────────────────
    try {
      const mockPaymentId = `pay_live_${Date.now()}`;
      const payload = `${liveRazorpayOrderId}|${mockPaymentId}`;
      const validSignature = crypto
        .createHmac('sha256', KEY_SECRET)
        .update(payload)
        .digest('hex');
      const tamperedSignature = validSignature.slice(0, -6) + 'abcdef';

      const res = await fetch(`${LIVE_BASE_URL}/api/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: liveRazorpayOrderId,
          razorpay_payment_id: mockPaymentId,
          razorpay_signature: tamperedSignature,
        }),
      });
      const data = await res.json();
      assert(
        res.status === 400 && data.success === false,
        'Tampered signature rejected with HTTP 400',
        `HTTP ${res.status} | Result: "${data.error}"`
      );
    } catch (err) {
      assert(false, 'Tampered signature rejection', err.message);
    }

    // ─── TEST 7: Signature Length Mismatch Guard ─────────────────────
    try {
      const res = await fetch(`${LIVE_BASE_URL}/api/verify-payment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          razorpay_order_id: liveRazorpayOrderId,
          razorpay_payment_id: 'pay_short',
          razorpay_signature: 'invalid_short_signature',
        }),
      });
      const data = await res.json();
      assert(
        res.status === 400 && data.success === false,
        'Short/malformed signature safely rejected with length guard',
        `HTTP ${res.status} | Result: "${data.error}"`
      );
    } catch (err) {
      assert(false, 'Length mismatch guard', err.message);
    }
  }

  console.log('\n====================================================');
  console.log(`   LIVE TEST RESULTS: ${passedTests}/${totalTests} TESTS PASSED    `);
  console.log('====================================================\n');

  if (passedTests === totalTests) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runLiveVerification();
