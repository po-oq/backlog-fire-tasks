import React from 'react';
import type { Task } from '../types.js';

interface DashboardStatsProps {
  tasks: Task[];
  lastUpdated?: Date;
}

/**
 * Dashboard統計情報ヘッダーコンポーネント
 * タスク数、期限切れ数、明日期限数を表示
 */
export const DashboardStats: React.FC<DashboardStatsProps> = ({ 
  tasks, 
  lastUpdated = new Date() 
}) => {
  // 統計計算
  const totalTasks = tasks.length;
  const overdueTasks = tasks.filter(task => task.isOverdue).length;
  const dueTomorrowTasks = tasks.filter(task => task.isDueTomorrow).length;
  const completedTasks = tasks.filter(task => task.status === '完了').length;

  return (
    <div className="mb-4 flex justify-between items-center">
      {/* 統計バッジ */}
      <div className="space-x-2">
        {/* 総タスク数 */}
        <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
          ✅ 取得: {totalTasks}件
        </span>
        
        {/* 期限切れタスク数 */}
        <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-medium">
          🔥 期限切れ: {overdueTasks}件
        </span>
        
        {/* 明日期限タスク数 */}
        <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-medium">
          ⚠️ 明日期限: {dueTomorrowTasks}件
        </span>
        
        {/* 完了タスク数 */}
        {completedTasks > 0 && (
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
            ✨ 完了: {completedTasks}件
          </span>
        )}
      </div>
      
      {/* 最終更新時刻 */}
      <div className="text-sm text-gray-500">
        最終更新: {lastUpdated.toLocaleString('ja-JP')}
      </div>
    </div>
  );
};