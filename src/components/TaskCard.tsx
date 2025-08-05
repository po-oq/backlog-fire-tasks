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

  // 🎯 親子タスクタイトルのレンダリング（階層表示対応）
  const taskTitle = useMemo(() => {
    const titleClasses = `text-sm font-semibold text-gray-800 ${
      task.status === '完了' ? 'line-through' : ''
    }`;
    
    const linkClass = "text-blue-600 hover:text-blue-800 hover:underline transition-colors duration-150";
    
    // 親タスクがある場合の階層表示
    if (task.parentTask) {
      return (
        <div className="mb-2">
          {/* 親タスク */}
          <div className="text-sm font-medium text-gray-700 mb-1 flex items-center">
            <span className="text-gray-400 mr-2">📋</span>
            {backlogSpaceUrl ? (
              <a
                href={generateBacklogUrl(backlogSpaceUrl, task.parentTask.issueKey)}
                target="_blank"
                rel="noopener noreferrer"
                className={linkClass}
              >
                {task.parentTask.summary}
              </a>
            ) : (
              task.parentTask.summary
            )}
          </div>
          
          {/* 子タスク（インデント付き） */}
          <div className="ml-6 relative">
            <div className="absolute -left-4 top-0 text-gray-400 text-sm">∟</div>
            <h3 className={titleClasses}>
              {backlogSpaceUrl ? (
                <a
                  href={generateBacklogUrl(backlogSpaceUrl, task.issueKey)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={linkClass}
                >
                  {task.summary}
                </a>
              ) : (
                task.summary
              )}
            </h3>
          </div>
        </div>
      );
    }
    
    // 親タスクがない場合は通常表示
    return (
      <h3 className={`${titleClasses} mb-2 truncate`}>
        {backlogSpaceUrl ? (
          <a
            href={generateBacklogUrl(backlogSpaceUrl, task.issueKey)}
            target="_blank"
            rel="noopener noreferrer"
            className={linkClass}
          >
            {task.summary}
          </a>
        ) : (
          task.summary
        )}
      </h3>
    );
  }, [task.summary, task.status, task.issueKey, task.parentTask, backlogSpaceUrl]);

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