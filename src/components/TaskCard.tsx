import React from 'react';
import type { Task } from '../types.js';

interface TaskCardProps {
  task: Task;
  className?: string;
  backlogSpaceUrl?: string; // Backlog スペースのURL（オプション）
}

/**
 * 日付を yyyy-mm-dd(曜日) 形式でフォーマット
 */
const formatDateWithDayOfWeek = (dateString?: string): string => {
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
    return dateString; // フォーマットエラー時は元の文字列を返す
  }
};

/**
 * Backlog課題のURLを生成
 */
const generateBacklogUrl = (spaceUrl: string, issueKey: string): string => {
  // Backlog URL形式: https://space.backlog.jp/view/PROJECT-123
  const baseUrl = spaceUrl.replace(/\/$/, ''); // 末尾のスラッシュを除去
  return `${baseUrl}/view/${issueKey}`;
};

/**
 * 個別タスクカードコンポーネント
 * XSS安全（React自動エスケープ）かつ型安全な実装
 */
export const TaskCard: React.FC<TaskCardProps> = ({ 
  task, 
  className = '', 
  backlogSpaceUrl 
}) => {
  // 期限切れ状況に基づく表示設定
  const getStatusConfig = () => {
    if (task.isOverdue) {
      return {
        icon: '🔥',
        borderColor: 'border-red-500',
        bgColor: '',
        badgeColor: 'bg-red-100 text-red-800',
        badgeText: `${task.overdueDays}日遅延`,
        dueDateColor: 'text-red-600',
        iconAnimation: 'fire-animation',
        hoverBg: 'hover:bg-red-50'
      };
    }
    
    if (task.isDueTomorrow) {
      return {
        icon: '⚠️',
        borderColor: 'border-yellow-500',
        bgColor: 'bg-yellow-50',
        badgeColor: 'bg-yellow-100 text-yellow-800',
        badgeText: '明日期限',
        dueDateColor: 'text-yellow-600',
        iconAnimation: '',
        hoverBg: 'hover:bg-yellow-100'
      };
    }
    
    if (task.status === '完了') {
      return {
        icon: '✅',
        borderColor: 'border-green-500',
        bgColor: 'opacity-75',
        badgeColor: 'bg-green-100 text-green-800',
        badgeText: '完了',
        dueDateColor: 'text-green-600',
        iconAnimation: '',
        hoverBg: 'hover:bg-green-50'
      };
    }
    
    if (task.dueDate) {
      return {
        icon: '✅',
        borderColor: 'border-blue-500',
        bgColor: '',
        badgeColor: 'bg-green-100 text-green-800',
        badgeText: '期限内',
        dueDateColor: 'text-green-600',
        iconAnimation: '',
        hoverBg: 'hover:bg-blue-50'
      };
    }
    
    return {
      icon: '📝',
      borderColor: 'border-gray-400',
      bgColor: '',
      badgeColor: 'bg-gray-100 text-gray-800',
      badgeText: '期限未設定',
      dueDateColor: 'text-gray-500',
      iconAnimation: '',
      hoverBg: 'hover:bg-gray-50'
    };
  };

  const config = getStatusConfig();
  
  // 状態別の表示色
  const getStatusColor = () => {
    if (task.status === '完了') return 'text-green-600';
    if (task.status === '処理中') return 'text-yellow-600';
    return 'text-blue-600';
  };

  // タスクタイトルのレンダリング（リンクまたは通常のテキスト）
  const renderTaskTitle = () => {
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
    
    return (
      <h3 className={titleClasses}>
        {task.summary}
      </h3>
    );
  };

  return (
    <div
      className={`bg-white rounded-lg shadow-md p-3 border-l-4 hover:shadow-lg transition-all duration-200 ${config.borderColor} ${config.bgColor} ${config.hoverBg} ${className}`}
    >
      {/* ヘッダー行: アイコン + バッジ + 状態 */}
      <div className="flex justify-between items-start mb-2">
        <div className="flex items-center space-x-2">
          {/* 状態アイコン */}
          <span className={`text-xl ${config.iconAnimation}`}>
            {config.icon}
          </span>
          
          {/* 期限状況バッジ */}
          <span className={`text-xs px-2 py-1 rounded font-medium ${config.badgeColor}`}>
            {config.badgeText}
          </span>
          
          {/* プロジェクトキー */}
          <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
            {task.projectKey}
          </span>
          
          {/* 課題種別 */}
          <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
            {task.issueType}
          </span>
        </div>
        
        {/* 状態 */}
        <span className={`text-xs font-medium ${getStatusColor()}`}>
          {task.status}
        </span>
      </div>

      {/* タスクタイトル（リンク対応） */}
      {renderTaskTitle()}

      {/* フッター情報 */}
      <div className="flex justify-between items-center text-xs text-gray-600">
        <div className="flex items-center space-x-3">
          {/* 担当者 */}
          <span>👤 {task.assigneeName || '未割当'}</span>
          
          {/* 期限日 */}
          <span>
            期限:{' '}
            <span className={`font-medium ${config.dueDateColor}`}>
              {formatDateWithDayOfWeek(task.dueDate)}
            </span>
          </span>
          
          {/* 開始日 */}
          <span>開始: {formatDateWithDayOfWeek(task.startDate)}</span>
        </div>
        
        {/* 更新日 */}
        <span>更新: {formatDateWithDayOfWeek(task.updated)}</span>
      </div>
    </div>
  );
};