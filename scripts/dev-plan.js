#!/usr/bin/env node
/**
 * TapDev Studio - 开发计划管理脚本
 * 
 * 用法:
 *   node scripts/dev-plan.js                    # 显示开发计划概览
 *   node scripts/dev-plan.js --status          # 显示详细状态
 *   node scripts/dev-plan.js --next            # 显示下一个任务
 *   node scripts/dev-plan.js --complete <id>   # 标记任务完成
 *   node scripts/dev-plan.js --save             # 保存当前状态
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const PLAN_FILE = path.join(ROOT, 'docs', 'development-plan.json');

// 颜色定义
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
};

function log(msg, color = 'white') {
  console.log(`${colors[color]}${msg}${colors.reset}`);
}

// 加载开发计划
function loadPlan() {
  try {
    const content = fs.readFileSync(PLAN_FILE, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    log(`Error: 无法加载开发计划文件: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 保存开发计划
function savePlan(plan) {
  try {
    plan.lastUpdated = new Date().toISOString().split('T')[0];
    fs.writeFileSync(PLAN_FILE, JSON.stringify(plan, null, 2), 'utf8');
    log('开发计划已保存', 'green');
  } catch (error) {
    log(`Error: 无法保存开发计划: ${error.message}`, 'red');
    process.exit(1);
  }
}

// 显示概览
function showOverview(plan) {
  console.log('');
  log('╔════════════════════════════════════════════════════════════════════════╗', 'cyan');
  log('║          TapDev Studio 开发计划                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════════════════╝', 'cyan');
  console.log('');
  
  log(`版本: ${plan.version}  |  更新: ${plan.lastUpdated}`, 'dim');
  console.log('');

  // 阶段概览
  const phaseNames = {
    phase1: '稳定性提升',
    phase2: '核心功能增强',
    phase3: '用户体验',
    phase4: '生态扩展',
    phase5: '平台扩展',
  };

  const phaseColors = ['green', 'cyan', 'yellow', 'blue', 'red'];

  for (const [key, phase] of Object.entries(plan.phases)) {
    const status = phase.status === 'completed' ? '✓' : phase.status === 'in_progress' ? '→' : '○';
    const color = phaseColors[parseInt(key.replace('phase', '')) - 1];
    const taskCount = phase.tasks.filter(t => t.status === 'completed').length;
    const total = phase.tasks.length;
    
    log(`  ${status} ${phaseNames[key]} (${taskCount}/${total})`, color);
    log(`     ${phase.duration}`, 'dim');
  }

  console.log('');

  // 统计
  const stats = plan.statistics;
  log('═══════════════════════════════════════════════════════════════════════', 'dim');
  log(`总任务: ${stats.totalTasks}  |  已完成: ${stats.completedTasks}  |  待完成: ${stats.pendingTasks}`, 'white');
  log('═══════════════════════════════════════════════════════════════════════', 'dim');
  console.log('');
}

// 显示详细状态
function showStatus(plan) {
  console.log('');
  log('═══════════════════════════════════════════════════════════════════════', 'cyan');
  log('                           详细状态                                  ', 'cyan');
  log('═══════════════════════════════════════════════════════════════════════', 'cyan');
  console.log('');

  const priorityIcons = { high: '🔴', medium: '🟡', low: '🟢' };

  for (const [key, phase] of Object.entries(plan.phases)) {
    log(`【${phase.name}】(${phase.duration})`, 'bright');
    
    for (const task of phase.tasks) {
      const icon = task.status === 'completed' ? '✅' : task.status === 'in_progress' ? '🔄' : '⬜';
      const priority = priorityIcons[task.priority];
      const status = task.status === 'completed' ? colors.green : task.status === 'in_progress' ? colors.yellow : colors.dim;
      
      log(`  ${icon} [${task.id}] ${task.name} ${priority}`, status);
      log(`      ${task.description}`, 'dim');
    }
    console.log('');
  }
}

// 显示下一个待办任务
function showNext(plan) {
  console.log('');
  log('═══════════════════════════════════════════════════════════════════════', 'yellow');
  log('                           下一个任务                                ', 'yellow');
  log('═══════════════════════════════════════════════════════════════════════', 'yellow');
  console.log('');

  for (const [key, phase] of Object.entries(plan.phases)) {
    if (phase.status === 'completed') continue;

    const nextTask = phase.tasks.find(t => t.status === 'pending');
    if (nextTask) {
      log(`阶段: ${phase.name}`, 'bright');
      log(`任务: ${nextTask.name} [${nextTask.id}]`, 'cyan');
      log(`优先级: ${nextTask.priority.toUpperCase()}`, nextTask.priority === 'high' ? 'red' : nextTask.priority === 'medium' ? 'yellow' : 'green');
      log(`描述: ${nextTask.description}`, 'dim');
      log(`预期成果: ${nextTask.expectedResult}`, 'dim');
      console.log('');
      log(`提示: 运行 "node scripts/dev-plan.js --complete ${nextTask.id}" 标记完成`, 'green');
      return;
    }
  }

  log('所有任务已完成！🎉', 'green');
}

// 标记任务完成
function completeTask(plan, taskId) {
  let found = false;

  for (const [key, phase] of Object.entries(plan.phases)) {
    const task = phase.tasks.find(t => t.id === taskId);
    if (task) {
      task.status = 'completed';
      plan.statistics.completedTasks++;
      plan.statistics.pendingTasks--;
      found = true;

      log(`✅ 任务已完成: ${task.name} [${task.id}]`, 'green');
      console.log('');
      
      // 检查阶段是否完成
      const allCompleted = phase.tasks.every(t => t.status === 'completed');
      if (allCompleted) {
        phase.status = 'completed';
        plan.statistics.completedPhases++;
        log(`🎉 阶段完成: ${phase.name}`, 'cyan');
      }

      savePlan(plan);
      return;
    }
  }

  if (!found) {
    log(`Error: 未找到任务 ${taskId}`, 'red');
    process.exit(1);
  }
}

// 显示帮助
function showHelp() {
  console.log('');
  log('TapDev Studio 开发计划管理', 'bright');
  console.log('');
  log('用法:', 'bright');
  log('  node scripts/dev-plan.js                    # 显示开发计划概览', 'dim');
  log('  node scripts/dev-plan.js --status            # 显示详细状态', 'dim');
  log('  node scripts/dev-plan.js --next              # 显示下一个任务', 'dim');
  log('  node scripts/dev-plan.js --complete <id>     # 标记任务完成', 'dim');
  log('  node scripts/dev-plan.js --save              # 保存当前状态', 'dim');
  log('  node scripts/dev-plan.js --help              # 显示帮助', 'dim');
  console.log('');
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  const plan = loadPlan();

  if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
    showHelp();
    return;
  }

  switch (args[0]) {
    case '--status':
    case '-s':
      showStatus(plan);
      break;
    
    case '--next':
    case '-n':
      showNext(plan);
      break;
    
    case '--complete':
    case '-c':
      if (args[1]) {
        completeTask(plan, args[1]);
      } else {
        log('Error: 请提供任务 ID', 'red');
        log('例如: node scripts/dev-plan.js --complete P1-1', 'dim');
      }
      break;
    
    case '--save':
      savePlan(plan);
      break;
    
    default:
      showOverview(plan);
  }
}

main();
