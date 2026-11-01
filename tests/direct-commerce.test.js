const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

// ─── 1. COD OTP Cryptographic Hardening & Timing-Safe Verification ─────────
test('1. COD OTP Verification: Timing-safe HMAC-SHA256 matches and protects against timing attacks', () => {
  const otpSecret = 'muvera_super_secret_otp_key_at_least_32_characters_long_2026';
  const orderId = 'ord_live_test_1001';
  const otp = '482915';

  const expectedHmac = crypto.createHmac('sha256', otpSecret).update(`${orderId}:${otp}`).digest('hex');

  // Matching code
  const candidateCorrect = crypto.createHmac('sha256', otpSecret).update(`${orderId}:${otp}`).digest('hex');
  const bufExpected = Buffer.from(expectedHmac, 'utf8');
  const bufCandidate = Buffer.from(candidateCorrect, 'utf8');

  assert.equal(bufExpected.length === bufCandidate.length && crypto.timingSafeEqual(bufExpected, bufCandidate), true);

  // Wrong code
  const candidateWrong = crypto.createHmac('sha256', otpSecret).update(`${orderId}:999999`).digest('hex');
  const bufWrong = Buffer.from(candidateWrong, 'utf8');
  assert.equal(bufExpected.length === bufWrong.length && crypto.timingSafeEqual(bufExpected, bufWrong), false);

  // Length difference guard: should safely return false without throwing
  const shortBuf = Buffer.from('short_sig', 'utf8');
  const isMatchLengthMismatch = bufExpected.length === shortBuf.length && crypto.timingSafeEqual(bufExpected, shortBuf);
  assert.equal(isMatchLengthMismatch, false);
});

// ─── 2. COD Multi-Box Integer Paise Allocation ────────────────────────────
test('2. Multi-Box Parcel Packaging: Exact integer paise division with zero fractional float error', () => {
  const totalAmountPaise = 149900; // ₹1,499.00
  const boxCount = 3;

  const parcelAllocations = [];
  for (let i = 0; i < boxCount; i++) {
    const parcelCodPaise =
      i === boxCount - 1
        ? totalAmountPaise - Math.floor(totalAmountPaise / boxCount) * (boxCount - 1)
        : Math.floor(totalAmountPaise / boxCount);
    parcelAllocations.push(parcelCodPaise);
  }

  // Sum of parcels must exactly equal total amount in paise
  const allocatedSum = parcelAllocations.reduce((sum, p) => sum + p, 0);
  assert.equal(allocatedSum, totalAmountPaise);
  assert.equal(parcelAllocations[0], 49966);
  assert.equal(parcelAllocations[1], 49966);
  assert.equal(parcelAllocations[2], 49968); // Remainder cleanly allocated to final box
});

// ─── 3. Shiprocket Name Sanitization & Mandatory Last Name ────────────────
test('3. Shiprocket Payload: Splits full name into mandatory first name and last name', () => {
  function splitName(fullName) {
    const clean = (fullName || 'Customer').trim();
    const parts = clean.split(/\s+/);
    const firstName = parts[0] || 'Customer';
    const lastName = parts.slice(1).join(' ') || firstName;
    return { firstName, lastName };
  }

  // Single word name (e.g. "Abhi")
  const single = splitName('Abhi');
  assert.equal(single.firstName, 'Abhi');
  assert.equal(single.lastName, 'Abhi'); // Mandatory fallback to satisfy Shiprocket 422

  // Two word name
  const twoWord = splitName('Rahul Sharma');
  assert.equal(twoWord.firstName, 'Rahul');
  assert.equal(twoWord.lastName, 'Sharma');

  // Multi word name
  const multiWord = splitName('Harsh Vardhan Singh Rathore');
  assert.equal(multiWord.firstName, 'Harsh');
  assert.equal(multiWord.lastName, 'Vardhan Singh Rathore');

  // Empty string
  const empty = splitName('');
  assert.equal(empty.firstName, 'Customer');
  assert.equal(empty.lastName, 'Customer');
});

// ─── 4. Razorpay Webhook Length-Guarded HMAC Verification ─────────────────
test('4. Razorpay Webhook Security: Length-guarded HMAC prevents 500 crash on malformed header', () => {
  const webhookSecret = 'rzp_sec_webhook_master_key_muvera_2026';
  const payload = JSON.stringify({
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_test_001',
          amount: 299900,
          currency: 'INR',
        },
      },
    },
  });

  const validSignature = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');

  function verifyWebhookSignature(rawBody, headerSig, secret) {
    if (!secret) return false;
    const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
    const expBuf = Buffer.from(expected, 'utf8');
    const sigBuf = Buffer.from(headerSig || '', 'utf8');
    if (expBuf.length !== sigBuf.length) return false;
    return crypto.timingSafeEqual(expBuf, sigBuf);
  }

  // Valid signature
  assert.equal(verifyWebhookSignature(payload, validSignature, webhookSecret), true);

  // Malformed signature (different length) - must return false without throwing!
  assert.doesNotThrow(() => {
    assert.equal(verifyWebhookSignature(payload, 'short_sig', webhookSecret), false);
  });

  // Tampered payload
  const tamperedPayload = payload.replace('299900', '199900');
  assert.equal(verifyWebhookSignature(tamperedPayload, validSignature, webhookSecret), false);
});

// ─── 5. Partial Filter Compound Index Logic ───────────────────────────────
test('5. Idempotency Index Logic: Legacy keyless orders do not collide while non-null keys enforce uniqueness', () => {
  // Simulating MongoDB partialFilterExpression: { idempotencyKey: { $type: 'string' } }
  const index = new Set();

  function insertOrder(customerId, idempotencyKey) {
    // Only indexed if idempotencyKey is of type string
    if (typeof idempotencyKey === 'string') {
      const compoundKey = `${customerId}:${idempotencyKey}`;
      if (index.has(compoundKey)) {
        const err = new Error(`E11000 duplicate key error collection: orders index: customerId_1_idempotencyKey_1 dup key: { customerId: "${customerId}", idempotencyKey: "${idempotencyKey}" }`);
        err.code = 11000;
        throw err;
      }
      index.add(compoundKey);
    }
    return { customerId, idempotencyKey, inserted: true };
  }

  const customerId = 'cust_12345';

  // 1. First keyless order (e.g. legacy WhatsApp)
  assert.doesNotThrow(() => insertOrder(customerId, undefined));

  // 2. Second keyless order for same customer: MUST NOT collide!
  assert.doesNotThrow(() => insertOrder(customerId, undefined));
  assert.doesNotThrow(() => insertOrder(customerId, null));

  // 3. Order with valid idempotency key
  assert.doesNotThrow(() => insertOrder(customerId, 'key_abc_1'));

  // 4. Duplicate order with same idempotency key: MUST trigger E11000!
  assert.throws(
    () => insertOrder(customerId, 'key_abc_1'),
    (err) => err.code === 11000
  );

  // 5. Different customer with same idempotency key: Allowed (scoped to customerId)
  assert.doesNotThrow(() => insertOrder('cust_67890', 'key_abc_1'));
});

// ─── 6. Two-Path Inventory Cancellation & Warehouse Unpacking Gate ────────
test('6. Inventory Cancellation: Follows distinct reservation-release vs cancel_restock vs warehouse-unpacking paths', () => {
  function determineCancelAction(orderStatus, fulfilmentStatus) {
    if (fulfilmentStatus === 'packed') {
      return { action: 'warehouse_unpack_required', requiresUnpacking: true, restockOnHand: false };
    }
    if (fulfilmentStatus === 'allocated') {
      return { action: 'cancel_restock', movement: 'cancel_restock', restockOnHand: true };
    }
    if (fulfilmentStatus === 'unfulfilled') {
      return { action: 'release_reservation', restockOnHand: false, releaseHold: true };
    }
    return { action: 'none' };
  }

  // Pre-allocation: reservation release
  const preAlloc = determineCancelAction('open', 'unfulfilled');
  assert.equal(preAlloc.action, 'release_reservation');
  assert.equal(preAlloc.releaseHold, true);

  // Post-allocation: cancel_restock
  const postAlloc = determineCancelAction('open', 'allocated');
  assert.equal(postAlloc.action, 'cancel_restock');
  assert.equal(postAlloc.movement, 'cancel_restock');
  assert.equal(postAlloc.restockOnHand, true);

  // Post-packing: physical unpacking gate
  const postPack = determineCancelAction('open', 'packed');
  assert.equal(postPack.action, 'warehouse_unpack_required');
  assert.equal(postPack.requiresUnpacking, true);
  assert.equal(postPack.restockOnHand, false);
});
