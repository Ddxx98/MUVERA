// Intercept 'server-only' for standalone runner
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...rest: any[]) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, [id, ...rest]);
};

async function testSignupOtpFlow() {
  const { authService } = await import('../src/modules/auth/service');
  const { db } = await import('../src/lib/db');
  const { hashToken } = await import('../src/modules/auth/tokens');

  console.log('👑 STARTING 4-DIGIT SIGNUP OTP VERIFICATION TEST\n');

  const testEmail = `test_otp_${Date.now()}@muvera.club`;
  const testPhone = `91${Math.floor(10000000 + Math.random() * 90000000)}`;
  const testPassword = 'Password123!';

  // Step 1: Register User
  console.log('1. Registering new user:', testEmail);
  const regResult = await authService.registerUser({
    name: 'Test Customer',
    email: testEmail,
    phone: testPhone,
    password: testPassword,
  });

  if (!regResult.requiresVerification) {
    throw new Error('Registration should require verification!');
  }
  console.log('✓ Registration requiresVerification:', regResult.requiresVerification);

  // Check user in DB
  const userInDb = await db.getUserByEmail(testEmail);
  if (!userInDb) throw new Error('User was not saved to DB!');
  if (userInDb.emailVerified !== false) {
    throw new Error(`Expected emailVerified to be false, got ${userInDb.emailVerified}`);
  }
  console.log('✓ User stored with emailVerified === false');

  // Step 2: Attempt Login Before Verification
  console.log('\n2. Attempting login before OTP verification...');
  let loginBlocked = false;
  try {
    await authService.loginWithCredentials({
      email: testEmail,
      password: testPassword,
    });
  } catch (err: any) {
    if (err.code === 'EMAIL_NOT_VERIFIED') {
      loginBlocked = true;
      console.log('✓ Login correctly blocked with code: EMAIL_NOT_VERIFIED');
    } else {
      throw err;
    }
  }
  if (!loginBlocked) {
    throw new Error('Login should have been blocked for unverified user!');
  }

  // Find the token created for this user
  const tokens = (global as any)._muveraDb?.authTokens || [];
  // Also check MongoDB or memory
  const tokenDoc = tokens.find((t: any) => t.email.toLowerCase() === testEmail.toLowerCase() && t.usedAt === null);

  // Step 3: Test Invalid 4-Digit OTP
  console.log('\n3. Testing invalid 4-digit OTP rejection...');
  let invalidRejected = false;
  try {
    await authService.verifySignupOtp(testEmail, '0000');
  } catch (err: any) {
    if (err.code === 'INVALID_OTP') {
      invalidRejected = true;
      console.log('✓ Invalid OTP correctly rejected with code: INVALID_OTP');
    } else {
      throw err;
    }
  }
  if (!invalidRejected) {
    throw new Error('Invalid OTP was not rejected!');
  }

  // Step 4: Verify with correct OTP
  console.log('\n4. Verifying with correct OTP...');
  // We can simulate an OTP by creating a known 4-digit code
  const knownOtp = '7391';
  const knownHash = hashToken(knownOtp);
  await db.createAuthToken({
    userId: userInDb.id,
    email: testEmail,
    type: 'email_verify',
    tokenHash: knownHash,
    expiresAt: new Date(Date.now() + 10 * 60 * 1000),
  });

  const verifyResult = await authService.verifySignupOtp(testEmail, knownOtp);
  if (!verifyResult.token || !verifyResult.user) {
    throw new Error('verifySignupOtp failed to return user and token!');
  }
  console.log('✓ OTP verified successfully, JWT issued for:', verifyResult.user.email);

  // Check user in DB is now verified
  const updatedUser = await db.getUserByEmail(testEmail);
  if (updatedUser?.emailVerified !== true) {
    throw new Error(`Expected emailVerified to be true, got ${updatedUser?.emailVerified}`);
  }
  console.log('✓ DB updated with emailVerified === true');

  // Step 5: Attempt Login After Verification
  console.log('\n5. Attempting login now that email is verified...');
  const postVerifyLogin = await authService.loginWithCredentials({
    email: testEmail,
    password: testPassword,
  });
  if (!postVerifyLogin.token) {
    throw new Error('Login failed after verification!');
  }
  console.log('✓ Login succeeded seamlessly for verified account!');

  console.log('\n🎉 ALL 4-DIGIT SIGNUP OTP VERIFICATION TESTS PASSED!');
  process.exit(0);
}

testSignupOtpFlow().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
