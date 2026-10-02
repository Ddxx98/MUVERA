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
  console.log('Testing db.getProducts() via Mongoose...');
  const { db } = await import('../src/lib/db');
  const prods = await db.getProducts();
  console.log(`✓ SUCCESS! Retrieved ${prods.length} products from MongoDB Atlas.`);
  console.log(`  Sample item: "${prods[0]?.title}" by ${prods[0]?.brand}`);
}

main().catch(console.error);
