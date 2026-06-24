#!/usr/bin/env node
/**
 * TapDev Studio - 构建问题修复验证
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║     TapDev Studio - Build Fixes Verification     ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

let passed = 0;
let failed = 0;

function check(description, condition) {
  if (condition) {
    console.log(`  [PASS] ${description}`);
    passed++;
  } else {
    console.log(`  [FAIL] ${description}`);
    failed++;
  }
}

// Issue 1: duration 计算
const nativeServicePath = path.join(ROOT, 'apps', 'desktop', 'src', 'native-service.ts');
if (fs.existsSync(nativeServicePath)) {
  const content = fs.readFileSync(nativeServicePath, 'utf8');

  console.log('Issue 1: Duration Calculation');
  check('has startTime variable', content.includes('const startTime = Date.now()'));
  check('calculates duration variable', content.includes('const duration = Date.now() - startTime'));
  check('duration field uses calculated value', content.includes('duration,\n        errors:') || content.includes('duration,') && content.includes('const duration = Date.now()'));
} else {
  check('native-service.ts exists', false);
}

console.log('');

// Issue 2: Windows 进程终止
const runnerPath = path.join(ROOT, 'packages', 'server', 'src', 'unity-build-runner.ts');
if (fs.existsSync(runnerPath)) {
  const content = fs.readFileSync(runnerPath, 'utf8');

  console.log('Issue 2: Windows Process Termination');
  check('uses taskkill for Windows', content.includes("spawn('taskkill'"));
  check('has win32 platform check', content.includes("process.platform === 'win32'"));
  check('uses SIGTERM for Unix', content.includes("this.activeProcess.kill('SIGTERM')"));
  check('has fallback SIGKILL for Unix', content.includes("this.activeProcess?.kill('SIGKILL')"));
} else {
  check('unity-build-runner.ts exists', false);
}

console.log('');

// Issue 3: Unicode 转义
if (fs.existsSync(runnerPath)) {
  const content = fs.readFileSync(runnerPath, 'utf8');

  console.log('Issue 3: Unicode Escaping');
  check('no unicode escape for game', !content.includes('\\u5c0f\\u6e38\\u620f'));
  check('no unicode escape for build', !content.includes('\\u6784\\u5efa'));
  check('uses Chinese characters directly', content.includes('小游戏/构建'));
  check('added System.Diagnostics import', content.includes('using System.Diagnostics'));
}

console.log('');
console.log('════════════════════════════════════════════════════════════');
console.log(`Verification: ${passed} passed, ${failed} failed`);
console.log('════════════════════════════════════════════════════════════');
console.log('');

if (failed === 0) {
  console.log('[OK] All fixes verified successfully!');
  process.exit(0);
} else {
  console.log(`[ERROR] ${failed} verification(s) failed.`);
  process.exit(1);
}
