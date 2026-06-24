#!/usr/bin/env node
/**
 * TapDev Studio Setup Script
 * 
 * This script helps set up the development environment.
 * Supports both npm and pnpm package managers.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');

function log(message, type = 'info') {
  const colors = {
    info: '\x1b[36m',
    success: '\x1b[32m',
    warning: '\x1b[33m',
    error: '\x1b[31m',
    reset: '\x1b[0m'
  };
  console.log(`${colors[type]}[TapDev Setup]${colors.reset} ${message}`);
}

function checkNodeVersion() {
  const version = process.version;
  const major = parseInt(version.slice(1).split('.')[0]);
  if (major < 18) {
    log(`Node.js version ${version} is too old. Please upgrade to v18 or higher.`, 'error');
    process.exit(1);
  }
  log(`Node.js version: ${version}`, 'success');
}

function detectPackageManager() {
  // Check for pnpm first (preferred)
  if (fs.existsSync(path.join(ROOT_DIR, 'pnpm-lock.yaml'))) {
    return 'pnpm';
  }
  // Fallback to npm
  if (fs.existsSync(path.join(ROOT_DIR, 'package-lock.json'))) {
    return 'npm';
  }
  // Default to pnpm based on package.json
  return 'pnpm';
}

function installDependencies(pm) {
  log(`Installing dependencies using ${pm}...`, 'info');
  
  try {
    const startTime = Date.now();
    
    if (pm === 'pnpm') {
      execSync('corepack enable', { stdio: 'inherit', cwd: ROOT_DIR });
      execSync('corepack prepare pnpm@9.15.0 --activate', { stdio: 'inherit', cwd: ROOT_DIR });
      execSync('pnpm install', { stdio: 'inherit', cwd: ROOT_DIR });
    } else {
      execSync('npm install', { stdio: 'inherit', cwd: ROOT_DIR });
    }
    
    const duration = ((Date.now() - startTime) / 1000).toFixed(1);
    log(`Dependencies installed successfully in ${duration}s`, 'success');
    return true;
  } catch (error) {
    log(`Failed to install dependencies: ${error.message}`, 'error');
    return false;
  }
}

function verifyInstallation() {
  log('Verifying installation...', 'info');
  
  const requiredDirs = [
    'node_modules',
    'packages/core/node_modules',
    'packages/types/node_modules',
    'apps/studio/node_modules'
  ];
  
  let allExist = true;
  for (const dir of requiredDirs) {
    const dirPath = path.join(ROOT_DIR, dir);
    if (!fs.existsSync(dirPath)) {
      log(`Missing: ${dir}`, 'warning');
      allExist = false;
    }
  }
  
  if (allExist) {
    log('All required packages are installed', 'success');
  }
  
  return allExist;
}

function showNextSteps() {
  console.log('\n' + '='.repeat(60));
  console.log('Setup Complete! Next steps:');
  console.log('='.repeat(60));
  console.log('');
  console.log('1. Start the web development server:');
  console.log('   pnpm dev');
  console.log('');
  console.log('2. Start the desktop application:');
  console.log('   pnpm dev:desktop');
  console.log('');
  console.log('3. Build all packages:');
  console.log('   pnpm build');
  console.log('');
  console.log('4. Run type checking:');
  console.log('   pnpm typecheck');
  console.log('');
}

// Main execution
console.log('');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║          TapDev Studio - Development Setup                 ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('');

try {
  checkNodeVersion();
  const pm = detectPackageManager();
  log(`Detected package manager: ${pm}`, 'info');
  
  const installed = installDependencies(pm);
  if (installed) {
    verifyInstallation();
    showNextSteps();
  } else {
    log('Setup failed. Please check the error messages above.', 'error');
    process.exit(1);
  }
} catch (error) {
  log(`Setup error: ${error.message}`, 'error');
  process.exit(1);
}
