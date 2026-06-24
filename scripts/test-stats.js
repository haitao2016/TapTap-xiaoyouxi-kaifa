#!/usr/bin/env node
/**
 * TapDev Studio - 测试统计脚本
 * 
 * 统计测试覆盖率和测试用例数量
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const TESTS_DIR = path.join(ROOT, 'tests');
const PACKAGES_DIR = path.join(ROOT, 'packages');

// 颜色定义
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
};

function log(msg, color = 'reset') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

console.log('');
log('╔════════════════════════════════════════════════════════════════════════╗', 'cyan');
log('║          TapDev Studio - 测试统计                        ║', 'cyan');
log('╚════════════════════════════════════════════════════════════════════════╝', 'cyan');
console.log('');

// 统计测试文件
const testFiles = [];
const srcFiles = [];

function scanDir(dir, patterns, results) {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
        scanDir(fullPath, patterns, results);
      } else if (item.isFile()) {
        for (const pattern of patterns) {
          if (item.name.endsWith(pattern)) {
            results.push({
              path: fullPath,
              name: item.name,
              dir: path.dirname(fullPath),
            });
            break;
          }
        }
      }
    }
  } catch (error) {
    // 忽略无法访问的目录
  }
}

// 扫描测试文件
scanDir(TESTS_DIR, ['.test.ts'], testFiles);
log(`📁 测试文件: ${testFiles.length}`, 'yellow');
testFiles.forEach((f, i) => {
  log(`   ${i + 1}. ${f.name}`, 'reset');
});

// 扫描源代码文件
const srcPatterns = ['.ts', '.tsx'];
function scanSrcDir(dir) {
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
        scanSrcDir(fullPath);
      } else if (item.isFile()) {
        for (const pattern of srcPatterns) {
          if (item.name.endsWith(pattern) && !item.name.endsWith('.d.ts')) {
            srcFiles.push({
              path: fullPath,
              name: item.name,
              dir: path.dirname(fullPath).replace(ROOT, ''),
            });
            break;
          }
        }
      }
    }
  } catch (error) {
    // 忽略
  }
}

for (const subDir of ['packages', 'apps']) {
  const fullPath = path.join(ROOT, subDir);
  if (fs.existsSync(fullPath)) {
    scanSrcDir(fullPath);
  }
}

log(`\n📦 源代码文件: ${srcFiles.length}`, 'yellow');

// 按目录分组
const byDir = {};
srcFiles.forEach(f => {
  if (!byDir[f.dir]) {
    byDir[f.dir] = [];
  }
  byDir[f.dir].push(f.name);
});

log('\n📂 按目录统计:', 'cyan');
for (const [dir, files] of Object.entries(byDir)) {
  log(`  ${dir}: ${files.length} 文件`, 'reset');
}

// 统计测试用例数
let totalTests = 0;
let totalDescribe = 0;

testFiles.forEach(file => {
  const content = fs.readFileSync(file.path, 'utf8');
  const testMatches = content.match(/it\(|test\(/g);
  const describeMatches = content.match(/describe\(/g);
  
  totalTests += testMatches ? testMatches.length : 0;
  totalDescribe += describeMatches ? describeMatches.length : 0;
});

log(`\n🧪 测试统计:`, 'cyan');
log(`   测试用例: ${totalTests}`, 'green');
log(`   测试套件: ${totalDescribe}`, 'green');

// 计算覆盖率估算
const coverageEstimate = Math.min(100, Math.round((testFiles.length / Math.max(srcFiles.length, 1)) * 100));

log(`\n📊 覆盖率估算:`, 'cyan');
log(`   测试文件 / 源代码文件 = ${testFiles.length} / ${srcFiles.length}`, 'reset');
log(`   估算覆盖率: ~${coverageEstimate}%`, coverageEstimate >= 50 ? 'green' : 'yellow');

console.log('');
log('═══════════════════════════════════════════════════════════════════════', 'cyan');

// 生成测试报告
const report = {
  generatedAt: new Date().toISOString(),
  summary: {
    testFiles: testFiles.length,
    testCases: totalTests,
    testSuites: totalDescribe,
    sourceFiles: srcFiles.length,
    estimatedCoverage: `${coverageEstimate}%`,
  },
  testFiles: testFiles.map(f => ({
    name: f.name,
    path: f.path.replace(ROOT, ''),
  })),
  sourceFilesByDir: byDir,
};

const reportPath = path.join(ROOT, 'test-coverage-report.json');
try {
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');
  log(`\n📄 报告已保存: ${reportPath}`, 'green');
} catch (error) {
  log(`\n⚠️  无法保存报告: ${error.message}`, 'yellow');
}

console.log('');
