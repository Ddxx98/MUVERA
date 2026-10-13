#!/usr/bin/env node

/**
 * CI Script: Check for forbidden fixed pixel widths and heights
 * Scans src/app and src/components (excluding src/components/layout and svg files)
 * Blocks anti-patterns like w-[320px], h-[480px], max-w-[500px].
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIRS = [
  path.join(__dirname, '..', 'src', 'app'),
  path.join(__dirname, '..', 'src', 'components'),
];

const EXCLUDED_DIRS = [
  path.normalize(path.join(__dirname, '..', 'src', 'components', 'layout')),
  path.normalize(path.join(__dirname, '..', 'src', 'components', 'ui')),
];

// Regex matching hardcoded pixel sizing like w-[300px], h-[450px], min-w-[200px], max-w-[600px]
// Allowed: icons (e.g. w-4, w-5), percentages, rem, clamp, dvh, cqw, and layout primitives.
const FORBIDDEN_PIXEL_REGEX = /\b(w|h|min-w|min-h|max-w|max-h)-\[(\d+)px\]/g;

let totalFilesChecked = 0;
let violationsFound = 0;
const violations = [];

function scanDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const normalizedPath = path.normalize(fullPath);

    if (entry.isDirectory()) {
      if (EXCLUDED_DIRS.some((exc) => normalizedPath.startsWith(exc))) {
        continue;
      }
      scanDirectory(fullPath);
    } else if (
      entry.isFile() &&
      (entry.name.endsWith('.tsx') || entry.name.endsWith('.jsx')) &&
      !entry.name.endsWith('.svg')
    ) {
      totalFilesChecked++;
      const content = fs.readFileSync(fullPath, 'utf8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        let match;
        while ((match = FORBIDDEN_PIXEL_REGEX.exec(line)) !== null) {
          violationsFound++;
          violations.push({
            file: path.relative(path.join(__dirname, '..'), fullPath),
            line: index + 1,
            match: match[0],
            codeSnippet: line.trim(),
          });
        }
      });
    }
  }
}

console.log('🔍 [CI] Scanning codebase for hardcoded pixel dimensions (w-[...px], h-[...px])...');
ROOT_DIRS.forEach(scanDirectory);

console.log(`📁 Scanned ${totalFilesChecked} component & route templates.`);

if (violationsFound > 0) {
  console.error(`\n❌ Found ${violationsFound} forbidden fixed pixel layout declarations:\n`);
  violations.forEach((v) => {
    console.error(`  - ${v.file}:${v.line} -> "${v.match}" in: ${v.codeSnippet}`);
  });
  console.error('\n💡 Rule: Use fluid units (%, rem, vw, vh, dvh, clamp(), min(), max()) or layout primitives in src/components/layout.\n');
  process.exit(1);
} else {
  console.log('✅ Passed: Zero hardcoded pixel layout declarations found!');
  process.exit(0);
}
