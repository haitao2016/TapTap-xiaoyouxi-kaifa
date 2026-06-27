const fs = require('fs');
const path = require('path');

const coreSrc = path.join(__dirname, '..', 'packages', 'core', 'src');

function processFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  const original = content;

  const relative = path.relative(coreSrc, path.dirname(filePath));
  const depth = relative === '' ? 0 : relative.split(path.sep).length;
  const prefix = depth === 0 ? './' : '../'.repeat(depth);

  // Replace `import { randomUUID } from 'node:crypto'`
  content = content.replace(
    /import\s*\{\s*randomUUID\s*\}\s*from\s*['"]node:crypto['"]/g,
    `import { generateId as randomUUID } from '${prefix}utils/uuid'`
  );

  // Replace `import { randomUUID, createHash } from 'node:crypto'`
  content = content.replace(
    /import\s*\{\s*randomUUID\s*,\s*createHash\s*\}\s*from\s*['"]node:crypto['"]/g,
    (match) => {
      // Check if createHash is actually used
      const lines = content.split('\n');
      const importLine = lines.find(l => l.includes(match.trim()));
      if (content.includes('createHash(')) {
        return `import { createHash } from 'node:crypto';\nimport { generateId as randomUUID } from '${prefix}utils/uuid'`;
      }
      return `import { generateId as randomUUID } from '${prefix}utils/uuid'`;
    }
  );

  // Replace `import { createHash, randomUUID } from 'node:crypto'`
  content = content.replace(
    /import\s*\{\s*createHash\s*,\s*randomUUID\s*\}\s*from\s*['"]node:crypto['"]/g,
    (match) => {
      if (content.includes('createHash(')) {
        return `import { createHash } from 'node:crypto';\nimport { generateId as randomUUID } from '${prefix}utils/uuid'`;
      }
      return `import { generateId as randomUUID } from '${prefix}utils/uuid'`;
    }
  );

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed: ${path.relative(coreSrc, filePath)}`);
  }
}

function walkDir(dir) {
  if (!fs.existsSync(dir)) return;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walkDir(fullPath);
    } else if (entry.isFile() && entry.name.endsWith('.ts')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('node:crypto') && content.includes('randomUUID')) {
        processFile(fullPath);
      }
    }
  }
}

walkDir(coreSrc);
console.log('Done!');
