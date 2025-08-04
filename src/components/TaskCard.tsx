import React, { useMemo } from 'react';
import type { Task } from '../types';
import { getTaskStatusConfig, getTaskStatusColor, generateBacklogUrl, formatDateWithDayOfWeek } from './utils';

interface TaskCardProps {
  task: Task;
  className?: string;
  backlogSpaceUrl?: string; // Backlog スペースのURL（オプション）
}

/**
 * 個別タスクカードコンポーネント
 * XSS安全（React自動エスケープ）かつ型安全な実装
 */
export function TaskCard({ 
  task, 
  className = '', 
  backlogSpaceUrl 
}: TaskCardProps) {
  // 状態設定をuseMemoで最適化
  const config = useMemo(() => getTaskStatusConfig(task), [task]);
  
  // ステータス色をuseMemoで最適化
  const statusColor = useMemo(() => getTaskStatusColor(task.status), [task.status]);

  // タスクタイトルのレンダリング（useMemoで最適化）
  const taskTitle = useMemo(() => {
    const titleClasses = `text-sm font-semibold text-gray-800 mb-2 truncate ${
      task.status === '完了' ? 'line-through' : ''
    }`;
    
    if (backlogSpaceUrl) {
      const backlogUrl = generateBacklogUrl(backlogSpaceUrl, task.issueKey);
      return (
        <h3 className={titleClasses}>
          <a
            href={backlogUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-150"
          >
            {task.summary}
          </a>
        </h3>
      );
    }
    
    return <h3 className={titleClasses}>{task.summary}</h3>;
  }, [task.summary, task.status, task.issueKey, backlogSpaceUrl]);

  return (
    <div className={`bg-white rounded-lg shadow-md p-3 border-l-4 hover:shadow-lg transition-all duration-200 ${config.borderColor} ${config.bgColor} ${config.hoverBg} ${className}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          <span className={`text-xl ${config.iconAnimation}`}>
            {config.icon}
          </span>
          <span className={`text-xs px-2 py-1 rounded font-medium ${config.badgeColor}`}>
            {config.badgeText}
          </span>
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
            {task.projectKey}
          </span>
          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
            {task.issueType}
          </span>
        </div>
        <span className={`text-xs font-medium ${statusColor}`}>
          {task.status}
        </span>
      </div>

      {taskTitle}

      <div className="flex justify-between items-center text-xs text-gray-600">
        <div className="flex items-center space-x-3">
          <span>👤 {task.assigneeName || '未割当'}</span>
          <span>
            期限:{' '}
            <span className={`font-medium ${config.dueDateColor}`}>
              {formatDateWithDayOfWeek(task.dueDate)}
            </span>
          </span>
          <span>開始: {formatDateWithDayOfWeek(task.startDate)}</span>
        </div>
        <span>更新: {formatDateWithDayOfWeek(task.updated)}</span>
      </div>
    </div>
  );
}