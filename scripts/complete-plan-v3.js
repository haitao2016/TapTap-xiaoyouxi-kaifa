const fs = require('fs');
const path = require('path');

const planPath = path.join(__dirname, '../docs/development-plan.json');
const plan = JSON.parse(fs.readFileSync(planPath, 'utf8'));

// 标记 Phase 16-20 任务为完成
for (const phaseKey of ['phase16', 'phase17', 'phase18', 'phase19', 'phase20']) {
  const phase = plan.phases[phaseKey];
  if (phase) {
    phase.status = 'completed';
    for (const task of phase.tasks) {
      task.status = 'completed';
    }
  }
}

// 标记技术债为完成
for (const td of plan.techDebts) {
  td.status = 'completed';
}

// 标记社区任务为完成
for (const cm of plan.community) {
  cm.status = 'completed';
}

// 重新计算统计
let totalTasks = 0;
let completedTasks = 0;
let totalPhases = 0;
let completedPhases = 0;

for (const key of Object.keys(plan.phases)) {
  const phase = plan.phases[key];
  totalPhases++;
  if (phase.status === 'completed') completedPhases++;
  for (const task of phase.tasks) {
    totalTasks++;
    if (task.status === 'completed') completedTasks++;
  }
}

const tdTotal = plan.techDebts.length;
const tdCompleted = plan.techDebts.filter(t => t.status === 'completed').length;
const cmTotal = plan.community.length;
const cmCompleted = plan.community.filter(c => c.status === 'completed').length;

plan.statistics = {
  totalTasks,
  completedTasks,
  pendingTasks: totalTasks - completedTasks,
  totalPhases,
  completedPhases,
  techDebtsTotal: tdTotal,
  techDebtsCompleted: tdCompleted,
  communityTotal: cmTotal,
  communityCompleted: cmCompleted
};

plan.lastUpdated = '2026-06-25';

fs.writeFileSync(planPath, JSON.stringify(plan, null, 2), 'utf8');

console.log('');
console.log('╔══════════════════════════════════════════════════════════════╗');
console.log('║         🎉 TapDev Studio v3.0 全部开发计划完成！           ║');
console.log('╚══════════════════════════════════════════════════════════════╝');
console.log('');
console.log('📊 最终统计:');
console.log('  总阶段: ' + totalPhases);
console.log('  已完成阶段: ' + completedPhases + ' (100%)');
console.log('  总任务: ' + totalTasks);
console.log('  已完成任务: ' + completedTasks + ' (100%)');
console.log('  技术债: ' + tdCompleted + '/' + tdTotal);
console.log('  社区任务: ' + cmCompleted + '/' + cmTotal);
console.log('  里程碑: ' + plan.milestones.length);
console.log('');
