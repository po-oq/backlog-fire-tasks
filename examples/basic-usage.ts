/**
 * Backlog Fire Tasks - 基本的な使用方法
 * 
 * このサンプルでは、Backlogからタスクを取得して基本的な情報を表示する方法を示します。
 * 
 * 実行前に以下の環境変数を設定してください：
 * - BACKLOG_SPACE_URL: https://your-space.backlog.jp
 * - BACKLOG_API_KEY: your-api-key
 */

import { fetchBacklogTasks } from '../src/api.js';
import type { Task } from '../src/types.js';

async function basicUsageExample() {
  console.log('🔥 Backlog Fire Tasks - 基本的な使用方法');
  console.log('=====================================');
  
  try {
    // 1. 環境変数の確認
    const requiredEnvVars = ['BACKLOG_SPACE_URL', 'BACKLOG_API_KEY'];
    const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
      console.error('❌ 以下の環境変数が設定されていません:');
      missingVars.forEach(varName => {
        console.error(`   - ${varName}`);
      });
      console.error('\n設定例:');
      console.error('export BACKLOG_SPACE_URL="https://your-space.backlog.jp"');
      console.error('export BACKLOG_API_KEY="your-api-key"');
      return;
    }

    console.log('🔍 Backlogからタスクを取得中...');
    
    // 2. タスク取得（Result型の適切な処理）
    const tasksResult = await fetchBacklogTasks();
    
    if (tasksResult.isErr()) {
      throw new Error(`タスク取得に失敗しました: ${tasksResult.error.message}`);
    }
    
    const tasks = tasksResult.value;
    
    // 3. 基本統計の表示
    console.log('✅ タスク取得完了!');
    console.log(`📊 取得したタスク数: ${tasks.length}件`);
    
    if (tasks.length === 0) {
      console.log('💡 タスクが見つかりませんでした。PROJECT_KEYSやMEMBER_KEYSの設定を確認してください。');
      return;
    }

    // 4. タスクの状態別集計
    const statusCounts = tasks.reduce((acc, task) => {
      acc[task.status] = (acc[task.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n📋 ステータス別集計:');
    Object.entries(statusCounts).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}件`);
    });

    // 5. プロジェクト別集計
    const projectCounts = tasks.reduce((acc, task) => {
      acc[task.projectKey] = (acc[task.projectKey] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n🎯 プロジェクト別集計:');
    Object.entries(projectCounts).forEach(([project, count]) => {
      console.log(`   ${project}: ${count}件`);
    });

    // 6. 担当者別集計
    const assigneeCounts = tasks.reduce((acc, task) => {
      const assignee = task.assigneeName || '未割当';
      acc[assignee] = (acc[assignee] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\n👤 担当者別集計:');
    Object.entries(assigneeCounts).forEach(([assignee, count]) => {
      console.log(`   ${assignee}: ${count}件`);
    });

    // 7. 最新のタスク5件を表示
    console.log('\n📝 最新のタスク（5件）:');
    tasks
      .sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime())
      .slice(0, 5)
      .forEach((task, index) => {
        const overdueStatus = task.isOverdue ? '🔥' : task.isDueTomorrow ? '⚠️' : '📝';
        console.log(`   ${index + 1}. ${overdueStatus} [${task.projectKey}] ${task.summary}`);
        console.log(`      担当: ${task.assigneeName || '未割当'} | 期限: ${task.dueDate || '未設定'} | 更新: ${task.updated}`);
      });

    console.log('\n🎉 基本的な使用方法の実行が完了しました！');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error instanceof Error ? error.message : error);
    console.error('\n💡 トラブルシューティング:');
    console.error('   1. 環境変数の設定を確認してください');
    console.error('   2. APIキーの権限を確認してください');
    console.error('   3. スペースURLが正しいか確認してください');
  }
}

// スクリプトとして実行された場合
if (import.meta.url === `file://${process.argv[1]}`) {
  basicUsageExample().catch(console.error);
}

export { basicUsageExample };