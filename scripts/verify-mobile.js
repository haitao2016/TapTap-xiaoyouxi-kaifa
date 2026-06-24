#!/usr/bin/env node
/**
 * TapDev Studio - 移动端模块验证
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const MOBILE_SRC = path.join(ROOT, 'apps', 'mobile', 'src');

console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║      TapDev Studio - Mobile Module Verification     ║');
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

// 1. 检查 native-bridge.ts 是否正确实现
const nativeBridgePath = path.join(MOBILE_SRC, 'native-bridge.ts');
if (fs.existsSync(nativeBridgePath)) {
  const content = fs.readFileSync(nativeBridgePath, 'utf8');
  
  check('native-bridge.ts exists', true);
  check('has local interface definitions', content.includes('interface StatusBarPlugin'));
  check('has loadModule function', content.includes('async function loadModule'));
  check('uses Function constructor for require', content.includes('new Function'));
  check('has MobileNativeBridge class', content.includes('class MobileNativeBridge'));
  check('checks isNativePlatform', content.includes('isNativePlatform'));
  check('no static import for haptics', !content.includes("import { Haptics }"));
  check('no static import for keyboard', !content.includes("import { Keyboard }"));
  check('no static import for status-bar', !content.includes("import { StatusBar }"));
} else {
  check('native-bridge.ts exists', false);
}

console.log('');

// 2. 检查类型定义文件已删除
const oldTypeFiles = [
  path.join(MOBILE_SRC, 'types', 'capacitor-plugins.ts'),
  path.join(MOBILE_SRC, 'capacitor-plugins.d.ts'),
  path.join(MOBILE_SRC, 'capacitor.d.ts'),
];

for (const filePath of oldTypeFiles) {
  const exists = fs.existsSync(filePath);
  if (exists) {
    check(`${path.basename(filePath)} should be deleted`, false);
  } else {
    check(`${path.basename(filePath)} deleted`, true);
  }
}

console.log('');

// 3. 检查 package.json
const packageJsonPath = path.join(ROOT, 'apps', 'mobile', 'package.json');
if (fs.existsSync(packageJsonPath)) {
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  
  check('package.json has @capacitor/core', '@capacitor/core' in packageJson.dependencies);
  check('package.json has @capacitor/status-bar', '@capacitor/status-bar' in packageJson.dependencies);
  check('package.json has @capacitor/keyboard', '@capacitor/keyboard' in packageJson.dependencies);
  check('package.json has @capacitor/haptics', '@capacitor/haptics' in packageJson.dependencies);
} else {
  check('package.json exists', false);
}

// 4. 检查 tsconfig.json
const tsconfigPath = path.join(ROOT, 'apps', 'mobile', 'tsconfig.json');
if (fs.existsSync(tsconfigPath)) {
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf8'));
  
  check('tsconfig.json has skipLibCheck', tsconfig.compilerOptions.skipLibCheck === true);
  check('tsconfig.json configured correctly', tsconfig.compilerOptions.moduleResolution === 'bundler');
}

console.log('');
console.log('════════════════════════════════════════════════════════════');
console.log(`Verification: ${passed} passed, ${failed} failed`);
console.log('════════════════════════════════════════════════════════════');
console.log('');

if (failed === 0) {
  console.log('[OK] All verifications passed! Mobile module configured correctly.');
  process.exit(0);
} else {
  console.log(`[ERROR] ${failed} verification(s) failed.`);
  process.exit(1);
}
