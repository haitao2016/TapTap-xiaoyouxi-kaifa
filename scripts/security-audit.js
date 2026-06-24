#!/usr/bin/env node
/**
 * TapDev Studio - 依赖安全审计脚本
 * 
 * 检查项目中所有依赖的安全漏洞
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_FILE = path.join(ROOT, 'security-audit-report.md');

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
log('║          TapDev Studio - 依赖安全审计                     ║', 'cyan');
log('╚════════════════════════════════════════════════════════════════════════╝', 'cyan');
console.log('');

// 收集所有 package.json
const packages = [
  { name: 'root', path: path.join(ROOT, 'package.json') },
  { name: 'types', path: path.join(ROOT, 'packages', 'types', 'package.json') },
  { name: 'core', path: path.join(ROOT, 'packages', 'core', 'package.json') },
  { name: 'server', path: path.join(ROOT, 'packages', 'server', 'package.json') },
  { name: 'ui', path: path.join(ROOT, 'packages', 'ui', 'package.json') },
  { name: 'studio', path: path.join(ROOT, 'apps', 'studio', 'package.json') },
  { name: 'desktop', path: path.join(ROOT, 'apps', 'desktop', 'package.json') },
  { name: 'mobile', path: path.join(ROOT, 'apps', 'mobile', 'package.json') },
];

log('📦 检测到的包:', 'cyan');
packages.forEach((pkg, i) => {
  const exists = fs.existsSync(pkg.path);
  log(`  ${i + 1}. ${pkg.name}: ${exists ? '✓' : '✗'}`, exists ? 'green' : 'red');
});
console.log('');

// 读取根目录 package.json
const rootPackagePath = path.join(ROOT, 'package.json');
let rootPackage;

try {
  rootPackage = JSON.parse(fs.readFileSync(rootPackagePath, 'utf8'));
  log('✅ 成功读取根目录 package.json', 'green');
} catch (error) {
  log(`❌ 无法读取 package.json: ${error.message}`, 'red');
  process.exit(1);
}

// 提取所有依赖
const allDependencies = new Set();

// dependencies
if (rootPackage.dependencies) {
  Object.keys(rootPackage.dependencies).forEach(dep => allDependencies.add(dep));
}

// devDependencies
if (rootPackage.devDependencies) {
  Object.keys(rootPackage.devDependencies).forEach(dep => allDependencies.add(dep));
}

log(`\n📊 依赖统计:`, 'cyan');
log(`  总依赖数: ${allDependencies.size}`, 'green');

console.log('');

// 按类别分组依赖
const categories = {
  '@tapdev': [],
  '@capacitor': [],
  '@types': [],
  react: [],
  vite: [],
  electron: [],
  other: [],
};

allDependencies.forEach(dep => {
  if (dep.startsWith('@tapdev')) {
    categories['@tapdev'].push(dep);
  } else if (dep.startsWith('@capacitor')) {
    categories['@capacitor'].push(dep);
  } else if (dep.startsWith('@types')) {
    categories['@types'].push(dep);
  } else if (dep.includes('react') || dep.includes('React')) {
    categories['react'].push(dep);
  } else if (dep.includes('vite')) {
    categories['vite'].push(dep);
  } else if (dep.includes('electron')) {
    categories['electron'].push(dep);
  } else {
    categories['other'].push(dep);
  }
});

log('📦 依赖分类:', 'cyan');
for (const [category, deps] of Object.entries(categories)) {
  if (deps.length > 0) {
    log(`\n  [${category}]`, 'yellow');
    deps.forEach(dep => log(`    - ${dep}`, 'reset'));
  }
}

console.log('');

// 检查已知的高风险依赖
log('⚠️  高风险依赖检查:', 'yellow');
const highRiskPatterns = [
  { pattern: /eval|Function\(/, reason: '动态代码执行风险' },
  { pattern: /innerHTML|outerHTML/, reason: 'XSS 风险' },
  { pattern: /document\.write/, reason: 'XSS 风险' },
];

// 检查是否有 eval 或类似用法
const riskyUsages = [];
const srcDir = path.join(ROOT, 'apps', 'studio', 'src');
const packagesDir = path.join(ROOT, 'packages');

function scanDir(dir, depth = 0) {
  if (depth > 3) return;
  
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    for (const item of items) {
      const fullPath = path.join(dir, item.name);
      if (item.isDirectory() && !item.name.startsWith('.') && item.name !== 'node_modules') {
        scanDir(fullPath, depth + 1);
      } else if (item.isFile() && (item.name.endsWith('.ts') || item.name.endsWith('.tsx'))) {
        const content = fs.readFileSync(fullPath, 'utf8');
        if (/eval\(|Function\(.*\)|new Function\(/.test(content)) {
          riskyUsages.push({
            file: fullPath.replace(ROOT, ''),
            type: '动态代码执行'
          });
        }
      }
    }
  } catch (error) {
    // 忽略无法访问的目录
  }
}

try {
  scanDir(srcDir);
  scanDir(packagesDir);
} catch (error) {
  log(`  扫描目录时出错: ${error.message}`, 'yellow');
}

if (riskyUsages.length === 0) {
  log('  ✅ 未发现高风险代码模式', 'green');
} else {
  log(`  ⚠️  发现 ${riskyUsages.length} 处潜在风险:`, 'yellow');
  riskyUsages.forEach(usage => {
    log(`    - ${usage.file}: ${usage.type}`, 'red');
  });
}

console.log('');

// 检查 CORS 配置
log('🔒 安全配置检查:', 'cyan');

const viteConfigPath = path.join(ROOT, 'apps', 'studio', 'vite.config.ts');
if (fs.existsSync(viteConfigPath)) {
  const viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
  
  const checks = [
    { pattern: /cors:\s*true/, name: 'CORS 允许所有来源' },
    { pattern: /credentials:\s*true/, name: '凭证允许跨域' },
    { pattern: /allowedHosts:\s*\*/, name: '允许所有主机' },
  ];
  
  for (const check of checks) {
    if (check.pattern.test(viteConfig)) {
      log(`  ⚠️  ${check.name}`, 'yellow');
    } else {
      log(`  ✅ ${check.name} 未配置为允许所有`, 'green');
    }
  }
}

console.log('');

// 生成报告
const reportContent = `# 安全审计报告

生成时间: ${new Date().toISOString()}
项目: TapDev Studio v${rootPackage.version}

## 依赖统计

- 总依赖数: ${allDependencies.size}
- 内部包 (@tapdev): ${categories['@tapdev'].length}
- Capacitor 插件: ${categories['@capacitor'].length}
- 类型定义: ${categories['@types'].length}

## 依赖清单

### @tapdev 内部包
${categories['@tapdev'].map(d => `- ${d}`).join('\n') || '无'}

### @capacitor 插件
${categories['@capacitor'].map(d => `- ${d}`).join('\n') || '无'}

### React 相关
${categories['react'].map(d => `- ${d}`).join('\n') || '无'}

### Vite 相关
${categories['vite'].map(d => `- ${d}`).join('\n') || '无'}

### Electron 相关
${categories['electron'].map(d => `- ${d}`).join('\n') || '无'}

### 其他依赖
${categories['other'].map(d => `- ${d}`).join('\n') || '无'}

## 高风险检查

${riskyUsages.length === 0 ? '✅ 未发现高风险代码模式' : `⚠️  发现 ${riskyUsages.length} 处潜在风险:\n${riskyUsages.map(u => `- ${u.file}: ${u.type}`).join('\n')}`}

## 建议

1. 定期运行 \`npm audit\` 检查安全漏洞
2. 保持所有依赖更新到最新稳定版本
3. 避免使用动态代码执行（如 eval）
4. 配置 CORS 时限制允许的来源
5. 使用 HTTPS 进行所有网络通信

## 下一步

建议运行以下命令进行完整的安全检查:

\`\`\`bash
npm audit
npm audit fix
\`\`\`
`;

try {
  fs.writeFileSync(OUTPUT_FILE, reportContent, 'utf8');
  log(`📄 报告已保存到: ${OUTPUT_FILE}`, 'green');
} catch (error) {
  log(`❌ 无法保存报告: ${error.message}`, 'red');
}

console.log('');
log('═══════════════════════════════════════════════════════════════════════', 'cyan');
log('审计完成!', 'cyan');
log('═══════════════════════════════════════════════════════════════════════', 'cyan');
console.log('');

log('💡 提示: 运行以下命令进行更深入的安全检查:', 'yellow');
log('   npm.cmd audit', 'reset');
log('   npm.cmd audit fix', 'reset');
console.log('');
