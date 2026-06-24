#!/usr/bin/env node
/**
 * TapDev Studio - 代码验证脚本
 * 
 * 在没有完整测试环境的情况下，验证核心代码的基本正确性
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const results = {
  passed: 0,
  failed: 0,
  errors: []
};

function log(msg, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    pass: '\x1b[32m',
    fail: '\x1b[31m',
    warn: '\x1b[33m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}[${type.toUpperCase()}]${colors.reset} ${msg}`);
}

function checkFile(filePath, checks) {
  const fullPath = path.join(ROOT, filePath);
  if (!fs.existsSync(fullPath)) {
    results.errors.push(`File not found: ${filePath}`);
    results.failed++;
    return false;
  }

  const content = fs.readFileSync(fullPath, 'utf8');
  let passed = true;

  for (const check of checks) {
    if (check.regex ? !check.regex.test(content) : !content.includes(check.string)) {
      results.errors.push(`${filePath}: ${check.description}`);
      log(`${filePath}: FAIL - ${check.description}`, 'fail');
      passed = false;
    } else {
      log(`${filePath}: PASS - ${check.description}`, 'pass');
      results.passed++;
    }
  }

  if (passed) results.passed++;
  else results.failed++;

  return passed;
}

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║          TapDev Studio - 代码验证                    ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

// 1. 检查 randomUUID 导入
log('检查 1: randomUUID 导入验证', 'info');
console.log('');

checkFile('packages/core/src/build-service.ts', [
  { string: "import { randomUUID } from 'node:crypto'", description: 'randomUUID 导入' }
]);

checkFile('packages/core/src/debug-client.ts', [
  { string: "import { randomUUID } from 'node:crypto'", description: 'randomUUID 导入' }
]);

checkFile('packages/core/src/debug-service.ts', [
  { string: "import { randomUUID } from 'node:crypto'", description: 'randomUUID 导入' }
]);

checkFile('packages/core/src/monitor-service.ts', [
  { string: "import { randomUUID } from 'node:crypto'", description: 'randomUUID 导入' }
]);

checkFile('packages/core/src/project-manager.ts', [
  { string: "import { randomUUID } from 'node:crypto'", description: 'randomUUID 导入' }
]);

console.log('');

// 2. 检查 Windows 平台兼容
log('检查 2: Windows 平台兼容性', 'info');
console.log('');

checkFile('packages/server/src/unity-build-runner.ts', [
  { string: "process.platform === 'win32'", description: 'Windows 平台判断' }
]);

console.log('');

// 3. 检查类型定义
log('检查 3: 类型定义', 'info');
console.log('');

checkFile('packages/types/src/index.ts', [
  { string: "export * from './build'", description: 'build 导出' },
  { string: "export * from './monitor'", description: 'monitor 导出' },
  { string: "export * from './plugin'", description: 'plugin 导出' }
]);

console.log('');

// 4. 检查核心服务导出
log('检查 4: 核心服务导出', 'info');
console.log('');

checkFile('packages/core/src/index.ts', [
  { string: 'monitorService', description: 'monitorService 导出' },
  { string: 'buildService', description: 'buildService 导出' },
  { string: 'pluginManager', description: 'pluginManager 导出' }
]);

console.log('');

// 5. 检查不存在 crypto.randomUUID 问题
log('检查 5: 确认无 crypto.randomUUID 问题', 'info');
console.log('');

const filesWithIssue = [];
const tsFiles = [
  'packages/core/src/build-service.ts',
  'packages/core/src/debug-client.ts',
  'packages/core/src/debug-service.ts',
  'packages/core/src/monitor-service.ts',
  'packages/core/src/project-manager.ts'
];

for (const file of tsFiles) {
  const fullPath = path.join(ROOT, file);
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    if (content.includes('crypto.randomUUID')) {
      filesWithIssue.push(file);
    }
  }
}

if (filesWithIssue.length === 0) {
  log('所有文件正确使用 randomUUID', 'pass');
  results.passed++;
} else {
  log(`发现 ${filesWithIssue.length} 个文件使用 crypto.randomUUID`, 'fail');
  filesWithIssue.forEach(f => log(`  - ${f}`, 'fail'));
  results.failed++;
}

console.log('');
console.log('════════════════════════════════════════════════════════════');
console.log(`验证结果: ${results.passed} 通过, ${results.failed} 失败`);
console.log('════════════════════════════════════════════════════════════');
console.log('');

if (results.errors.length > 0) {
  console.log('错误详情:');
  results.errors.forEach(e => console.log(`  - ${e}`));
  console.log('');
}

if (results.failed === 0) {
  log('所有验证通过！代码质量良好。', 'pass');
  process.exit(0);
} else {
  log(`有 ${results.failed} 项验证失败，请检查。`, 'fail');
  process.exit(1);
}
