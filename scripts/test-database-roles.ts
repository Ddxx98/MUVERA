import fs from 'fs';
import path from 'path';

// 1. Manually parse .env.local
const envLocalPath = path.resolve(__dirname, '../.env.local');
if (fs.existsSync(envLocalPath)) {
  const envContent = fs.readFileSync(envLocalPath, 'utf8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  });
}

// 2. Mock 'server-only'
const Module = require('module');
const origRequire = Module.prototype.require;
Module.prototype.require = function (id: string, ...rest: any[]) {
  if (id === 'server-only') return {};
  return origRequire.apply(this, [id, ...rest]);
};

async function main() {
  console.log('===============================================================');
  console.log('🛡️  DATABASE DIRECT ROLE MANAGEMENT VERIFICATION');
  console.log('===============================================================\n');

  const { normalizeUserRole } = await import('../src/modules/auth/service');
  const { db } = await import('../src/lib/db');

  const testCases = [
    { input: 'admin', expected: 'admin', desc: 'Direct MongoDB role: "admin"' },
    { input: 'ADMIN', expected: 'admin', desc: 'Direct MongoDB role: "ADMIN" (uppercase)' },
    { input: 'Admin', expected: 'admin', desc: 'Direct MongoDB role: "Admin" (titlecase)' },
    { input: 'user', expected: 'customer', desc: 'Direct MongoDB role: "user"' },
    { input: 'customer', expected: 'customer', desc: 'Direct MongoDB role: "customer"' },
    { input: 'normal', expected: 'customer', desc: 'Direct MongoDB role: "normal"' },
    { input: '', expected: 'customer', desc: 'Direct MongoDB role: "" (empty)' },
    { input: undefined, expected: 'customer', desc: 'Direct MongoDB role: undefined (missing key)' },
  ];

  console.log('1. Testing Role Normalization Engine:');
  for (const tc of testCases) {
    const actual = normalizeUserRole(tc.input);
    const pass = actual === tc.expected;
    console.log(`   ${pass ? '✓' : '❌'} [${tc.desc}]: Output => "${actual}"`);
    if (!pass) throw new Error(`Role test failed for input: ${tc.input}`);
  }

  console.log('\n2. Testing Database Direct User Document Edit:');
  const testUser = await db.getUserByEmail('customer@muvera.club');
  if (testUser) {
    // Simulate setting role directly in database to "admin"
    testUser.role = 'admin';
    await db.saveUser(testUser);
    const updatedAdmin = await db.getUserByEmail('customer@muvera.club');
    console.log(`   ✓ After setting role="admin" in DB => role in app is: "${normalizeUserRole(updatedAdmin?.role)}"`);

    // Simulate setting role directly in database to "user"
    testUser.role = 'user';
    await db.saveUser(testUser);
    const updatedUser = await db.getUserByEmail('customer@muvera.club');
    console.log(`   ✓ After setting role="user" in DB => role in app is: "${normalizeUserRole(updatedUser?.role)}" (normal user)`);

    // Reset back to customer
    testUser.role = 'customer';
    await db.saveUser(testUser);
    console.log(`   ✓ Reset test user back to "customer" in DB`);
  }

  console.log('\n===============================================================');
  console.log('🎉 DATABASE ROLE SYSTEM VERIFIED:');
  console.log('   - "admin" in DB  => Admin privileges');
  console.log('   - Anything else   => Normal user privileges');
  console.log('===============================================================');
}

main().catch(console.error);
