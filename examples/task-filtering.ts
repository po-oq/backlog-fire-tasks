/**
 * Backlog Fire Tasks - タスクフィルタリング
 * 
 * このサンプルでは、取得したタスクを様々な条件でフィルタリングする方法を示します。
 * プロジェクト、担当者、ステータス、期限などによる絞り込み機能の実例です。
 * 
 * 実行前に以下の環境変数を設定してください：
 * - BACKLOG_SPACE_URL: https://your-space.backlog.jp
 * - BACKLOG_API_KEY: your-api-key
 * - PROJECT_KEYS: PROJECT1,PROJECT2 (オプション)
 * - MEMBER_KEYS: user1,user2 (オプション)
 */

import { fetchBacklogTasks } from '../src/api.js';
import type { Task } from '../src/types.js';

// フィルター関数の定義
interface TaskFilters {
  byProject: (tasks: Task[], projectKeys: string[]) => Task[];
  byAssignee: (tasks: Task[], assigneeNames: string[]) => Task[];
  byStatus: (tasks: Task[], statuses: string[]) => Task[];
  byDueDate: (tasks: Task[], daysFromNow?: number) => Task[];
  byKeyword: (tasks: Task[], keyword: string) => Task[];
  byIssueType: (tasks: Task[], issueTypes: string[]) => Task[];
}

const taskFilters: TaskFilters = {
  // プロジェクトでフィルタリング
  byProject: (tasks: Task[], projectKeys: string[]) => {
    return tasks.filter(task => projectKeys.includes(task.projectKey));
  },

  // 担当者でフィルタリング
  byAssignee: (tasks: Task[], assigneeNames: string[]) => {
    return tasks.filter(task => {
      if (!task.assigneeName && assigneeNames.includes('未割当')) return true;
      return task.assigneeName && assigneeNames.includes(task.assigneeName);
    });
  },

  // ステータスでフィルタリング
  byStatus: (tasks: Task[], statuses: string[]) => {
    return tasks.filter(task => statuses.includes(task.status));
  },

  // 期限日でフィルタリング（指定日数以内）
  byDueDate: (tasks: Task[], daysFromNow: number = 7) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + daysFromNow);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    return tasks.filter(task => {
      if (!task.dueDate) return false;
      const dueDateStr = task.dueDate.split('T')[0];
      return dueDateStr <= targetDateStr;
    });
  },

  // キーワードでフィルタリング（タイトル検索）
  byKeyword: (tasks: Task[], keyword: string) => {
    const lowerKeyword = keyword.toLowerCase();
    return tasks.filter(task => 
      task.summary.toLowerCase().includes(lowerKeyword)
    );
  },

  // 課題種別でフィルタリング
  byIssueType: (tasks: Task[], issueTypes: string[]) => {
    return tasks.filter(task => issueTypes.includes(task.issueType));
  }
};

// 複合フィルター（複数条件の組み合わせ）
function complexFilter(tasks: Task[], conditions: {
  projects?: string[];
  assignees?: string[];
  statuses?: string[];
  daysFromNow?: number;
  keyword?: string;
  issueTypes?: string[];
}) {
  let filteredTasks = tasks;

  if (conditions.projects) {
    filteredTasks = taskFilters.byProject(filteredTasks, conditions.projects);
  }

  if (conditions.assignees) {
    filteredTasks = taskFilters.byAssignee(filteredTasks, conditions.assignees);
  }

  if (conditions.statuses) {
    filteredTasks = taskFilters.byStatus(filteredTasks, conditions.statuses);
  }

  if (conditions.daysFromNow !== undefined) {
    filteredTasks = taskFilters.byDueDate(filteredTasks, conditions.daysFromNow);
  }

  if (conditions.keyword) {
    filteredTasks = taskFilters.byKeyword(filteredTasks, conditions.keyword);
  }

  if (conditions.issueTypes) {
    filteredTasks = taskFilters.byIssueType(filteredTasks, conditions.issueTypes);
  }

  return filteredTasks;
}

// タスク表示ヘルパー
function displayTasks(tasks: Task[], title: string) {
  console.log(`\n${title} (${tasks.length}件)`);
  console.log('='.repeat(title.length + 10));
  
  if (tasks.length === 0) {
    console.log('  該当するタスクがありません');
    return;
  }

  tasks.forEach((task, index) => {
    const overdueIcon = task.isOverdue ? '🔥' : task.isDueTomorrow ? '⚠️' : '📝';
    const assignee = task.assigneeName || '未割当';
    const dueDate = task.dueDate || '未設定';
    
    console.log(`  ${index + 1}. ${overdueIcon} [${task.projectKey}][${task.issueType}] ${task.summary}`);
    console.log(`     担当: ${assignee} | 状態: ${task.status} | 期限: ${dueDate}`);
  });
}

async function taskFilteringExample() {
  console.log('🔥 Backlog Fire Tasks - タスクフィルタリング');
  console.log('===========================================');
  
  try {
    console.log('🔍 Backlogからタスクを取得中...');
    const tasks: Task[] = await fetchBacklogTasks();
    
    console.log(`✅ ${tasks.length}件のタスクを取得しました`);
    
    if (tasks.length === 0) {
      console.log('💡 タスクが見つかりません。フィルタリングのデモを実行できません。');
      return;
    }

    // 利用可能な値を取得
    const availableProjects = [...new Set(tasks.map(t => t.projectKey))];
    const availableAssignees = [...new Set(tasks.map(t => t.assigneeName || '未割当'))];
    const availableStatuses = [...new Set(tasks.map(t => t.status))];
    const availableIssueTypes = [...new Set(tasks.map(t => t.issueType))];

    console.log('\n🎯 利用可能なフィルター項目:');
    console.log(`   プロジェクト: ${availableProjects.join(', ')}`);
    console.log(`   担当者: ${availableAssignees.join(', ')}`);
    console.log(`   ステータス: ${availableStatuses.join(', ')}`);
    console.log(`   課題種別: ${availableIssueTypes.join(', ')}`);

    // 1. プロジェクトでフィルタリング
    if (availableProjects.length > 1) {
      const firstProject = availableProjects[0];
      const projectTasks = taskFilters.byProject(tasks, [firstProject]);
      displayTasks(projectTasks, `📁 プロジェクト「${firstProject}」のタスク`);
    }

    // 2. 担当者でフィルタリング
    if (availableAssignees.length > 1) {
      const firstAssignee = availableAssignees[0];
      const assigneeTasks = taskFilters.byAssignee(tasks, [firstAssignee]);
      displayTasks(assigneeTasks, `👤 担当者「${firstAssignee}」のタスク`);
    }

    // 3. ステータスでフィルタリング
    const activeTasks = taskFilters.byStatus(tasks, ['処理中', '未対応', 'In Progress', 'Open']);
    displayTasks(activeTasks, '🔄 アクティブなタスク（処理中・未対応）');

    // 4. 期限でフィルタリング（7日以内）
    const upcomingTasks = taskFilters.byDueDate(tasks, 7);
    displayTasks(upcomingTasks, '📅 7日以内に期限のタスク');

    // 5. キーワード検索（「テスト」を含む）
    const testTasks = taskFilters.byKeyword(tasks, 'テスト');
    displayTasks(testTasks, '🔍 「テスト」を含むタスク');

    // 6. 複合フィルター例
    const urgentTasks = complexFilter(tasks, {
      statuses: ['処理中', '未対応', 'In Progress', 'Open'],
      daysFromNow: 3
    });
    displayTasks(urgentTasks, '🚨 緊急タスク（アクティブ & 3日以内期限）');

    // 7. 高度な複合フィルター例
    if (availableProjects.length > 1 && availableAssignees.length > 1) {
      const complexTasks = complexFilter(tasks, {
        projects: [availableProjects[0]],
        assignees: [availableAssignees[0]],
        statuses: ['処理中', '未対応', 'In Progress', 'Open']
      });
      displayTasks(complexTasks, 
        `🎯 複合フィルター（${availableProjects[0]} & ${availableAssignees[0]} & アクティブ）`);
    }

    // 8. カスタムフィルター例（期限切れ + 特定プロジェクト）
    const overdueInProject = tasks.filter(task => 
      task.isOverdue && availableProjects.includes(task.projectKey)
    );
    displayTasks(overdueInProject, '🔥 期限切れタスク');

    console.log('\n💡 フィルタリングのヒント:');
    console.log('   - 複数のフィルターを組み合わせて条件を絞り込めます');
    console.log('   - PROJECT_KEYSやMEMBER_KEYS環境変数で事前フィルタリング可能です');
    console.log('   - 正規表現を使ったより高度な検索も実装できます');

    console.log('\n🎉 タスクフィルタリングのデモが完了しました！');
    
  } catch (error) {
    console.error('❌ エラーが発生しました:', error instanceof Error ? error.message : error);
    console.error('\n💡 環境変数の設定を確認してください');
  }
}

// スクリプトとして実行された場合（Windows/Unix対応）
import { fileURLToPath } from 'url';

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  taskFilteringExample().catch(console.error);
}

export { taskFilteringExample, taskFilters, complexFilter };