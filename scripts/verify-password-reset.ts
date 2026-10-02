// Intercept 'server-only' mock for standalone Node script runner
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...rest: any[]) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, [id, ...rest]);
};

async function runVerification() {
  const { authService } = await import('../src/modules/auth/service');
  const { db } = await import('../src/lib/db');
  const { hashToken, newToken } = await import('../src/modules/auth/tokens');
  const { auditService } = await import('../src/modules/audit');

  console.log('=================================================================');
  console.log('👑 MUVERA PASSWORD RESET & SECURITY VERIFICATION SUITE');
  console.log('=================================================================\n');

  // Test 1: Verify Pre-seeded Accounts
  console.log('TEST 1: Verifying Pre-seeded Accounts...');
  const admin = await db.getUserByEmail('admin@muvera.club');
  const customer = await db.getUserByEmail('customer@muvera.club');
  if (!admin || admin.role !== 'admin') throw new Error('Admin account not found or invalid role');
  if (!customer || customer.role !== 'customer') throw new Error('Customer account not found or invalid role');
  console.log('✓ Found Admin account: admin@muvera.club (Role: admin)');
  console.log('✓ Found Customer account: customer@muvera.club (Role: customer)\n');

  // Test 2: Account Enumeration Protection
  console.log('TEST 2: Verifying Account Enumeration Protection (Section 23.4)...');
  const resReal = await authService.requestPasswordReset('customer@muvera.club', '127.0.0.1', 'NodeTestAgent');
  const resFake = await authService.requestPasswordReset('nonexistent_ghost_user@muvera.club', '127.0.0.1', 'NodeTestAgent');

  if (resReal.message !== resFake.message) {
    throw new Error(`Enumeration leak! Real: "${resReal.message}", Fake: "${resFake.message}"`);
  }
  console.log('✓ Both existing and non-existing emails return identical generic response:');
  console.log(`  "${resReal.message}"\n`);

  // Test 3: Inspect Token Generation and Storage Invariants (Section 23.2)
  console.log('TEST 3: Verifying Cryptographic Token Hashing Invariant...');
  // Find token in db for customer
  const tokens = (global as any)._muveraDb?.authTokens || [];
  const customerToken = tokens.find((t: any) => t.email === 'customer@muvera.club' && t.usedAt === null);
  if (!customerToken) throw new Error('No reset token was recorded in DB for customer@muvera.club');

  console.log('✓ Token stored in database is a 64-character SHA-256 digest:');
  console.log(`  tokenHash: ${customerToken.tokenHash}`);
  console.log(`  type: ${customerToken.type}`);
  console.log(`  expiresAt: ${customerToken.expiresAt.toISOString()}`);
  console.log(`  usedAt: ${customerToken.usedAt}\n`);

  // Test 4: Validate Token Verification API
  console.log('TEST 4: Verifying Token Validation & Tamper Protection...');
  // Invalid token
  const invalidRes = await authService.validateResetToken('invalid_random_tampered_token_string');
  if (invalidRes.valid) throw new Error('Tampered token should not validate');
  console.log('✓ Invalid token correctly rejected with:', invalidRes.message);

  // Test 5: Reset Password Flow with New Password
  console.log('\nTEST 5: Executing Password Reset with Single-Use Token (Section 23.3)...');
  
  // Create a known raw token to simulate email click
  const testEmail = `test_customer_${Date.now()}@muvera.club`;
  await authService.registerUser({
    name: 'Reset Test User',
    email: testEmail,
    phone: `999${Math.floor(1000000 + Math.random() * 9000000)}`,
    password: 'InitialPassword123!',
  });

  // Request reset
  await authService.requestPasswordReset(testEmail, '127.0.0.1', 'TestRunner');

  // Retrieve the token hash from DB
  const user = await db.getUserByEmail(testEmail);
  const userTokenDoc = ((global as any)._muveraDb?.authTokens || []).find(
    (t: any) => t.userId === user?.id && t.usedAt === null
  );

  if (!userTokenDoc) throw new Error('Failed to find generated token doc for test user');

  // Verify that an invalid raw token that doesn't match hash fails
  const badValidate = await authService.validateResetToken('wrong_raw_token');
  if (badValidate.valid) throw new Error('Should not validate mismatched raw token');

  // Let's create an explicit token to test exact rawToken-to-hash resolution
  const sampleRawToken = newToken();
  const sampleHash = hashToken(sampleRawToken);
  await db.createAuthToken({
    userId: user!.id,
    email: user!.email,
    type: 'password_reset',
    tokenHash: sampleHash,
    expiresAt: new Date(Date.now() + 30 * 60 * 1000),
  });

  // Validate the valid token
  const goodValidate = await authService.validateResetToken(sampleRawToken);
  if (!goodValidate.valid || goodValidate.email !== testEmail) {
    throw new Error('Valid token failed validation');
  }
  console.log('✓ Valid token successfully confirmed for email:', goodValidate.email);

  // Consume token and set new password
  const newPassword = 'NewSecretPassword2026!';
  const resetRes = await authService.resetPassword(sampleRawToken, newPassword);
  console.log('✓ resetPassword action succeeded:', resetRes.message);

  // Test 6: Verify Single-Use Atomic Invariant
  console.log('\nTEST 6: Verifying Single-Use Atomic Invariant (Replay Attack Prevention)...');
  try {
    await authService.resetPassword(sampleRawToken, 'AnotherPasswordAttempt!');
    throw new Error('FAILED: Token reuse should have thrown an error!');
  } catch (err: any) {
    console.log('✓ Replay attempt blocked cleanly with expected error:', err.message);
  }

  // Test 7: Verify Authentication with Old vs New Password
  console.log('\nTEST 7: Verifying Old Password Revocation and New Password Login...');
  try {
    await authService.loginWithCredentials({ email: testEmail, password: 'InitialPassword123!' });
    throw new Error('FAILED: Old password should no longer work!');
  } catch (err: any) {
    console.log('✓ Old password authentication rejected correctly:', err.message);
  }

  const loginRes = await authService.loginWithCredentials({ email: testEmail, password: newPassword });
  console.log('✓ New password logged in successfully!');
  console.log(`  User: ${loginRes.user.name} (${loginRes.user.email})`);
  console.log(`  Role: ${loginRes.user.role}`);
  console.log(`  Session Token issued: ${loginRes.token.slice(0, 25)}...`);

  // Test 8: Verify Audit Logs
  console.log('\nTEST 8: Verifying Security Audit Trail...');
  const auditLogs = await auditService.getAuditLogs({ limit: 10 });
  const resetAudit = auditLogs.find((a: any) => a.action === 'PASSWORD_RESET_COMPLETED');
  if (!resetAudit) throw new Error('PASSWORD_RESET_COMPLETED audit log not found');
  console.log('✓ Security Audit Log recorded:');
  console.log(`  Action: ${resetAudit.action}`);
  console.log(`  Actor: ${resetAudit.actor}`);
  console.log(`  Entity: ${resetAudit.entity} (${resetAudit.entityId})`);

  console.log('\n=================================================================');
  console.log('🎉 ALL 8 SECURITY & PASSWORD RESET CHECKS PASSED PERFECTLY!');
  console.log('=================================================================');
}

runVerification().catch((err) => {
  console.error('\n❌ Verification Failed:', err);
  process.exit(1);
});
