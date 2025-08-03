import React from 'react';
import type { Task } from '../types.js';
import { TaskCard } from './TaskCard.js';
import { DashboardStats } from './DashboardStats.js';

interface DashboardProps {
  tasks: Task[];
  lastUpdated?: Date;
  backlogSpaceUrl?: string; // Backlog スペースのURL（オプション）
}

/**
 * メインDashboardコンポーネント
 * CLAUDE.md仕様に完全準拠 - <html>含む完全なページ
 */
export const Dashboard: React.FC<DashboardProps> = ({ 
  tasks, 
  lastUpdated = new Date(),
  backlogSpaceUrl 
}) => {
  return (
    <html>
      <head>
        <title>Backlog Tasks 🔥</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <meta charSet="UTF-8" />
        <style>{`
          @keyframes pulse-fire {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.1); }
          }
          .fire-animation {
            animation: pulse-fire 1.5s ease-in-out infinite;
          }
          @media (min-width: 768px) {
            .grid-cols-1 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
          }
          @media (min-width: 1024px) {
            .grid-cols-1 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
          }
          @media (min-width: 1280px) {
            .grid-cols-1 { grid-template-columns: repeat(4, minmax(0, 1fr)); }
          }
        `}</style>
      </head>
      <body className="bg-gray-50 p-4">
        <div className="max-w-full mx-auto">
          {/* ヘッダータイトル */}
          <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            タスク管理ダッシュボード 📋
          </h1>

          {/* 統計情報ヘッダー */}
          <DashboardStats tasks={tasks} lastUpdated={lastUpdated} />

          {/* タスクカード一覧 */}
          <div className="grid grid-cols-1 gap-3">
            {tasks.map((task) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                backlogSpaceUrl={backlogSpaceUrl}
              />
            ))}
          </div>

          {/* フッター */}
          <div className="mt-6 text-center text-gray-500 text-sm">
            <p>
              📊 合計タスク数: {tasks.length}件 | サーバー停止:{' '}
              <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+C</kbd>
            </p>
          </div>
        </div>
      </body>
    </html>
  );
};