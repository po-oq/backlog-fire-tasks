/**
 * Backlog Fire Tasks - 期限切れタスク検出
 * 
 * このサンプルでは、期限切れタスクの検出、分析、アラート機能を示します。
 * 🔥アイコンで視覚的に期限切れを表現し、チーム管理に役立つ機能を提供します。
 * 
 * 実行前に以下の環境変数を設定してください：
 * - BACKLOG_SPACE_URL: https://your-space.backlog.jp
 * - BACKLOG_API_KEY: your-api-key
 * - PROJECT_KEYS: PROJECT1,PROJECT2 (オプション)
 * - MEMBER_KEYS: user1,user2 (オプション)
 */

import { fetchBacklogTasks, calculateOverdueStatus } from '../src/api.js';
import type { Task } from '../src/types.js';

// 期限管理レポート型定義
interface OverdueReport {
  total: number;
  overdue: Task[];
  dueTomorrow: Task[];
  dueThisWeek: Task[];
  withoutDueDate: Task[];
  byAssignee: Record<string, {
    overdue: number;
    dueTomorrow: number;
    total: number;
  }>;
  byProject: Record<string, {
    overdue: number;
    dueTomorrow: number;
    total: number;
  }>;
  mostOverdue: Task | null;
  urgentTasks: Task[];
}

// 期限管理分析関数
function analyzeOverdueTasks(tasks: Task[]): OverdueReport {
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const nextWeek = new Date(today);
  nextWeek.setDate(today.getDate() + 7);

  const todayStr = today.toISOString().split('T')[0];
  const nextWeekStr = nextWeek.toISOString().split('T')[0];

  // 基本分類
  const overdue = tasks.filter(task => task.isOverdue);
  const dueTomorrow = tasks.filter(task => task.isDueTomorrow);
  const dueThisWeek = tasks.filter(task => {
    if (!task.dueDate) return false;
    const dueDateStr = task.dueDate.split('T')[0];
    return dueDateStr > todayStr && dueDateStr <= nextWeekStr && !task.isDueTomorrow;
  });
  const withoutDueDate = tasks.filter(task => !task.dueDate);

  // 担当者別分析
  const byAssignee: Record<string, { overdue: number; dueTomorrow: number; total: number }> = {};
  tasks.forEach(task => {
    const assignee = task.assigneeName || '未割当';
    if (!byAssignee[assignee]) {
      byAssignee[assignee] = { overdue: 0, dueTomorrow: 0, total: 0 };
    }
    byAssignee[assignee].total++;
    if (task.isOverdue) byAssignee[assignee].overdue++;
    if (task.isDueTomorrow) byAssignee[assignee].dueTomorrow++;
  });

  // プロジェクト別分析
  const byProject: Record<string, { overdue: number; dueTomorrow: number; total: number }> = {};
  tasks.forEach(task => {
    if (!byProject[task.projectKey]) {
      byProject[task.projectKey] = { overdue: 0, dueTomorrow: 0, total: 0 };
    }
    byProject[task.projectKey].total++;
    if (task.isOverdue) byProject[task.projectKey].overdue++;
    if (task.isDueTomorrow) byProject[task.projectKey].dueTomorrow++;
  });

  // 最も遅延しているタスク
  const mostOverdue = overdue.reduce((max, task) => {
    return (!max || task.overdueDays > max.overdueDays) ? task : max;
  }, null as Task | null);

  // 緊急タスク（期限切れ + 明日期限）
  const urgentTasks = [...overdue, ...dueTomorrow].sort((a, b) => {
    if (a.isOverdue && !b.isOverdue) return -1;
    if (!a.isOverdue && b.isOverdue) return 1;
    return b.overdueDays - a.overdueDays;
  });

  return {
    total: tasks.length,
    overdue,
    dueTomorrow,
    dueThisWeek,
    withoutDueDate,
    byAssignee,
    byProject,
    mostOverdue,
    urgentTasks
  };
}

// アラート生成関数
function generateAlerts(report: OverdueReport): string[] {
  const alerts: string[] = [];

  // 重要度に応じたアラート
  if (report.overdue.length > 0) {
    alerts.push(`🔥🚨 緊急: ${report.overdue.length}件の期限切れタスクがあります！`);
  }

  if (report.dueTomorrow.length > 0) {
    alerts.push(`⚠️📅 注意: ${report.dueTomorrow.length}件のタスクが明日期限です`);
  }

  // 個人別アラート
  Object.entries(report.byAssignee).forEach(([assignee, stats]) => {
    if (stats.overdue > 3) {
      alerts.push(`👤🔥 ${assignee}さんに期限切れタスクが${stats.overdue}件集中しています`);
    }
  });

  // プロジェクト別アラート
  Object.entries(report.byProject).forEach(([project, stats]) => {
    const overdueRate = stats.overdue / stats.total;
    if (overdueRate > 0.5 && stats.total > 2) {
      alerts.push(`📁🔥 ${project}プロジェクトで期限切れ率が${Math.round(overdueRate * 100)}%です`);
    }
  });

  // 期限未設定アラート
  if (report.withoutDueDate.length > report.total * 0.3) {
    alerts.push(`📝⚠️ 期限未設定のタスクが${report.withoutDueDate.length}件（${Math.round(report.withoutDueDate.length / report.total * 100)}%）あります`);
  }

  return alerts;
}

// レポート表示関数
function displayOverdueReport(report: OverdueReport) {
  console.log('\n🔥 期限切れタスク分析レポート');
  console.log('================================');

  // サマリー
  console.log(`📊 総タスク数: ${report.total}件`);
  console.log(`🔥 期限切れ: ${report.overdue.length}件`);
  console.log(`⚠️ 明日期限: ${report.dueTomorrow.length}件`);
  console.log(`📅 今週期限: ${report.dueThisWeek.length}件`);
  console.log(`📝 期限未設定: ${report.withoutDueDate.length}件`);

  // アラート表示
  const alerts = generateAlerts(report);
  if (alerts.length > 0) {
    console.log('\n🚨 アラート:');
    alerts.forEach(alert => console.log(`   ${alert}`));
  }

  // 期限切れタスク詳細
  if (report.overdue.length > 0) {
    console.log('\n🔥 期限切れタスク一覧:');
    report.overdue
      .sort((a, b) => b.overdueDays - a.overdueDays)
      .forEach((task, index) => {
        console.log(`   ${index + 1}. [${task.overdueDays}日遅延] ${task.summary}`);
        console.log(`      📁 ${task.projectKey} | 👤 ${task.assigneeName || '未割当'} | 📅 期限: ${task.dueDate}`);
      });
  }

  // 明日期限タスク
  if (report.dueTomorrow.length > 0) {
    console.log('\n⚠️ 明日期限タスク:');
    report.dueTomorrow.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task.summary}`);
      console.log(`      📁 ${task.projectKey} | 👤 ${task.assigneeName || '未割当'}`);
    });
  }

  // 担当者別統計
  console.log('\n👤 担当者別期限管理状況:');
  Object.entries(report.byAssignee)
    .sort(([, a], [, b]) => b.overdue - a.overdue)
    .forEach(([assignee, stats]) => {
      const overdueRate = Math.round((stats.overdue / stats.total) * 100);
      const status = stats.overdue > 0 ? '🔥' : stats.dueTomorrow > 0 ? '⚠️' : '✅';
      console.log(`   ${status} ${assignee}: ${stats.overdue}件期限切れ / ${stats.total}件中 (${overdueRate}%)`);
    });

  // プロジェクト別統計
  console.log('\n📁 プロジェクト別期限管理状況:');
  Object.entries(report.byProject)
    .sort(([, a], [, b]) => b.overdue - a.overdue)
    .forEach(([project, stats]) => {
      const overdueRate = Math.round((stats.overdue / stats.total) * 100);
      const status = stats.overdue > 0 ? '🔥' : stats.dueTomorrow > 0 ? '⚠️' : '✅';
      console.log(`   ${status} ${project}: ${stats.overdue}件期限切れ / ${stats.total}件中 (${overdueRate}%)`);
    });

  // 最も遅延しているタスク
  if (report.mostOverdue) {
    console.log('\n💥 最も遅延しているタスク:');
    console.log(`   🔥 ${report.mostOverdue.overdueDays}日遅延: ${report.mostOverdue.summary}`);
    console.log(`   📁 ${report.mostOverdue.projectKey} | 👤 ${report.mostOverdue.assigneeName || '未割当'}`);
    console.log(`   📅 期限: ${report.mostOverdue.dueDate} | 更新: ${report.mostOverdue.updated}`);
  }
}

// 期限切れタスク管理の推奨アクション
function suggestActions(report: OverdueReport) {
  console.log('\n💡 推奨アクション:');

  if (report.overdue.length > 0) {
    console.log('   🔥 期限切れタスク対応:');
    console.log('     - 最も遅延の大きいタスクから優先的に対応');
    console.log('     - 期限の再設定や作業分割を検討');
    console.log('     - 必要に応じてリソースの再配分');
  }

  if (report.dueTomorrow.length > 0) {
    console.log('   ⚠️ 明日期限タスク対応:');
    console.log('     - 今日中に完了できるか確認');
    console.log('     - 困難な場合は関係者に連絡');
  }

  if (report.withoutDueDate.length > report.total * 0.2) {
    console.log('   📝 期限未設定タスク対応:');
    console.log('     - 適切な期限を設定');
    console.log('     - 優先度の明確化');
  }

  // 個別の推奨事項
  Object.entries(report.byAssignee).forEach(([assignee, stats]) => {
    if (stats.overdue > 2) {
      console.log(`   👤 ${assignee}さんへ: タスクの整理と優先順位の見直しを提案`);
    }
  });
}

async function overdueDetectionExample() {
  console.log('🔥 Backlog Fire Tasks - 期限切れタスク検出');
  console.log('==========================================');
  
  try {
    console.log('🔍 Backlogからタスクを取得中...');
    const tasks: Task[] = await fetchBacklogTasks();
    
    console.log(`✅ ${tasks.length}件のタスクを取得しました`);
    
    if (tasks.length === 0) {
      console.log('💡 タスクが見つかりません。期限切れ検出のデモを実行できません。');
      return;
    }

    // 期限切れ分析実行
    const report = analyzeOverdueTasks(tasks);
    
    // レポート表示
    displayOverdueReport(report);
    
    // 推奨アクション
    suggestActions(report);

    // デモ用: calculateOverdueStatus関数の直接使用例
    console.log('\n🧮 期限計算機能のデモ:');
    const demoTasks = [
      { name: '昨日期限のタスク', dueDate: '2025-07-29' },
      { name: '今日期限のタスク', dueDate: '2025-07-30' },
      { name: '明日期限のタスク', dueDate: '2025-07-31' },
      { name: '来週期限のタスク', dueDate: '2025-08-06' },
      { name: '期限未設定のタスク', dueDate: undefined }
    ];

    demoTasks.forEach(demo => {
      const status = calculateOverdueStatus(demo.dueDate);
      const icon = status.isOverdue ? '🔥' : status.isDueTomorrow ? '⚠️' : '📝';
      const statusText = status.isOverdue 
        ? `${status.overdueDays}日遅延` 
        : status.isDueTomorrow 
          ? '明日期限' 
          : '期限内または未設定';
      
      console.log(`   ${icon} ${demo.name}: ${statusText}`);
    });

    console.log('\n🎉 期限切れタスク検出のデモが完了しました！');
    console.log('\n💡 定期実行のヒント:');
    console.log('   - cronやGitHub Actionsで定期実行');
    console.log('   - Slack/Teams通知との連携');
    console.log('   - ダッシュボードの自動更新');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error instanceof Error ? error.message : error);
    console.error('\n💡 環境変数の設定を確認してください');
  }
}

// スクリプトとして実行された場合（Windows/Unix対応）
import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  overdueDetectionExample().catch(console.error);
}

export { overdueDetectionExample, analyzeOverdueTasks, generateAlerts };