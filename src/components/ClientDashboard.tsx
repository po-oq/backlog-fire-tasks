import React, { useState, useEffect } from 'react';
import type { Task } from '../types.js';
import { TaskCard } from './TaskCard.js';

type FilterType = 'all' | 'overdue' | 'due-tomorrow';

interface ClientDashboardProps {
  backlogSpaceUrl?: string;
}

/**
 * クライアントサイドDashboardコンポーネント
 * APIからタスクを取得し、フィルタリング機能付きで表示
 */
export const ClientDashboard: React.FC<ClientDashboardProps> = ({ 
  backlogSpaceUrl 
}) => {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filteredTasks, setFilteredTasks] = useState<Task[]>([]);
  const [currentFilter, setCurrentFilter] = useState<FilterType>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // APIからタスクを取得
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/tasks');
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'タスク取得に失敗しました');
        }
        
        const tasksData: Task[] = await response.json();
        setTasks(tasksData);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchTasks();
  }, []);

  // フィルタリング処理
  useEffect(() => {
    let filtered = [...tasks];
    
    switch (currentFilter) {
      case 'overdue':
        filtered = tasks.filter(task => task.isOverdue);
        break;
      case 'due-tomorrow':
        filtered = tasks.filter(task => task.isDueTomorrow);
        break;

      case 'all':
      default:
        filtered = tasks;
        break;
    }
    
    setFilteredTasks(filtered);
  }, [tasks, currentFilter]);

  // 統計計算
  const totalTasks = tasks.length;
  const overdueTasks = tasks.filter(task => task.isOverdue).length;
  const dueTomorrowTasks = tasks.filter(task => task.isDueTomorrow).length;


  // フィルタクリックハンドラー
  const handleFilterClick = (filter: FilterType) => {
    setCurrentFilter(filter);
  };

  // ローディング表示
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">⏳</div>
          <h2 className="text-xl font-semibold text-gray-700">タスクを読み込み中...</h2>
          <p className="text-gray-500 mt-2">Backlog APIからデータを取得しています</p>
        </div>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-xl font-semibold text-red-700 mb-2">エラーが発生しました</h2>
          <p className="text-red-600 bg-red-50 p-4 rounded-lg">{error}</p>
          <button 
            onClick={() => globalThis.window?.location.reload()} 
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
          >
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-full mx-auto">
        {/* ヘッダータイトル */}
        <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          タスク管理ダッシュボード 📋
        </h1>

        {/* 統計情報ヘッダー（クリック可能） */}
        <div className="mb-4 flex justify-between items-center">
          {/* 統計バッジ */}
          <div className="space-x-2">
            {/* 総タスク数 */}
            <button
              onClick={() => handleFilterClick('all')}
              className={`px-2 py-1 rounded text-sm font-medium transition-all duration-200 ${
                currentFilter === 'all'
                  ? 'bg-green-200 text-green-900 shadow-md'
                  : 'bg-green-100 text-green-800 hover:bg-green-200 hover:shadow-md'
              }`}
            >
              📊 取得: {totalTasks}件
            </button>
            
            {/* 期限切れタスク数 */}
            <button
              onClick={() => handleFilterClick('overdue')}
              className={`px-2 py-1 rounded text-sm font-medium transition-all duration-200 ${
                currentFilter === 'overdue'
                  ? 'bg-red-200 text-red-900 shadow-md'
                  : 'bg-red-100 text-red-800 hover:bg-red-200 hover:shadow-md'
              }`}

            >
              🔥 期限切れ: {overdueTasks}件
            </button>
            
            {/* 明日期限タスク数 */}
            <button
              onClick={() => handleFilterClick('due-tomorrow')}
              className={`px-2 py-1 rounded text-sm font-medium transition-all duration-200 ${
                currentFilter === 'due-tomorrow'
                  ? 'bg-yellow-200 text-yellow-900 shadow-md'
                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:shadow-md'
              }`}

            >
              ⚠️ 明日期限: {dueTomorrowTasks}件
            </button>
            

          </div>
          
          {/* 最終更新時刻 */}
          <div className="text-sm text-gray-500">
            最終更新: {lastUpdated.toLocaleString('ja-JP')}
          </div>
        </div>

        {/* 現在のフィルター表示 */}
        {currentFilter !== 'all' && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-blue-700 font-medium">
                🔍 フィルター: 
                {currentFilter === 'overdue' && ' 期限切れタスク'}
                {currentFilter === 'due-tomorrow' && ' 明日期限タスク'}

              </span>
              <span className="text-blue-600">
                {filteredTasks.length}件 / {totalTasks}件
              </span>
            </div>
            <button
              onClick={() => handleFilterClick('all')}
              className="text-blue-600 hover:text-blue-800 hover:underline text-sm"
            >
              すべて表示
            </button>
          </div>
        )}

        {/* タスクカード一覧 */}
        <div className="grid grid-cols-1 gap-3">
          {filteredTasks.length > 0 ? (
            filteredTasks.map((task) => (
              <TaskCard 
                key={task.id} 
                task={task} 
                backlogSpaceUrl={backlogSpaceUrl}
              />
            ))
          ) : (
            <div className="text-center py-12 text-gray-500">
              <div className="text-6xl mb-4">
                {currentFilter === 'all' ? '📭' : '🔍'}
              </div>
              <h3 className="text-lg font-medium mb-2">
                {currentFilter === 'all' 
                  ? 'タスクが見つかりません' 
                  : 'フィルター条件に該当するタスクがありません'
                }
              </h3>
              <p className="text-sm">
                {currentFilter === 'all' ? (
                  <>
                    環境変数の設定を確認してください<br />
                    (MEMBER_KEYS, PROJECT_KEYS)
                  </>
                ) : (
                  '他のフィルターを試すか、すべて表示に戻してください'
                )}
              </p>
            </div>
          )}
        </div>

        {/* フッター */}
        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>
            📊 表示中: {filteredTasks.length}件 / 総タスク数: {totalTasks}件 | サーバー停止:{' '}
            <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+C</kbd>
          </p>
        </div>
      </div>
    </div>
  );
};