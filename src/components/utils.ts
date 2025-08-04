import type { Task } from '../types';
import { STATUS_CONFIG, STATUS_COLORS } from './constants';

// タスクの状態設定を取得するピュア関数
export function getTaskStatusConfig(task: Task) {
  if (task.isOverdue) {
    return {
      ...STATUS_CONFIG.overdue,
      badgeText: `${task.overdueDays}日遅延`
    };
  }
  
  if (task.isDueTomorrow) {
    return {
      ...STATUS_CONFIG.dueTomorrow,
      badgeText: '明日期限'
    };
  }
  
  if (task.status === '完了') {
    return {
      ...STATUS_CONFIG.completed,
      badgeText: '完了'
    };
  }
  
  if (task.dueDate) {
    return {
      ...STATUS_CONFIG.withinDeadline,
      badgeText: '期限内'
    };
  }
  
  return {
    ...STATUS_CONFIG.noDeadline,
    badgeText: '期限未設定'
  };
}

// ステータス色を取得するピュア関数
export function getTaskStatusColor(status: string): string {
  return STATUS_COLORS[status as keyof typeof STATUS_COLORS] || STATUS_COLORS.default;
}

// Backlog URLを生成するピュア関数
export function generateBacklogUrl(spaceUrl: string, issueKey: string): string {
  const baseUrl = spaceUrl.replace(/\/$/, '');
  return `${baseUrl}/view/${issueKey}`;
}

// 日付フォーマット関数
export function formatDateWithDayOfWeek(dateString?: string): string {
  if (!dateString) return '未設定';
  
  try {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    
    const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
    const dayOfWeek = dayNames[date.getDay()];
    
    return `${year}-${month}-${day}(${dayOfWeek})`;
  } catch {
    return dateString;
  }
}