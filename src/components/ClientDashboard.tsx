import React, { useCallback } from 'react';
import { TaskCard } from './TaskCard';
import { useTasks } from '../hooks/useTasks';
import { useTaskFilter, type FilterType } from '../hooks/useTaskFilter';

interface ClientDashboardProps {
  backlogSpaceUrl?: string;
}

/**
 * クライアントサイドDashboardコンポーネント
 * APIからタスクを取得し、フィルタリング機能付きで表示
 */
export function ClientDashboard({ 
  backlogSpaceUrl 
}: ClientDashboardProps) {
  // Custom hooks使用
  const { tasks, loading, error, lastUpdated } = useTasks();
  const { currentFilter, setCurrentFilter, filteredTasks, stats } = useTaskFilter(tasks);

  // フィルタクリックハンドラー（useCallbackで最適化）
  const handleFilterClick = useCallback((filter: FilterType) => {
    setCurrentFilter(filter);
  }, [setCurrentFilter]);

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
            onClick={() => window.location.reload()} 
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
        <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          タスク管理ダッシュボード 📋
        </h1>

        <div className="mb-4 flex justify-between items-center">
          <div className="space-x-2">
            <button
              onClick={() => handleFilterClick('all')}
              className={`px-2 py-1 rounded text-sm font-medium transition-all duration-200 ${
                currentFilter === 'all'
                  ? 'bg-green-200 text-green-900 shadow-md'
                  : 'bg-green-100 text-green-800 hover:bg-green-200 hover:shadow-md'
              }`}
            >
              📊 取得: {stats.totalTasks}件
            </button>
            
            <button
              onClick={() => handleFilterClick('overdue')}
              className={`px-2 py-1 rounded text-sm font-medium transition-all duration-200 ${
                currentFilter === 'overdue'
                  ? 'bg-red-200 text-red-900 shadow-md'
                  : 'bg-red-100 text-red-800 hover:bg-red-200 hover:shadow-md'
              }`}

            >
              🔥 期限切れ: {stats.overdueTasks}件
            </button>
            
            <button
              onClick={() => handleFilterClick('due-tomorrow')}
              className={`px-2 py-1 rounded text-sm font-medium transition-all duration-200 ${
                currentFilter === 'due-tomorrow'
                  ? 'bg-yellow-200 text-yellow-900 shadow-md'
                  : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:shadow-md'
              }`}

            >
              ⚠️ 明日期限: {stats.dueTomorrowTasks}件
            </button>
          </div>
          
          <div className="text-sm text-gray-500">
            最終更新: {lastUpdated.toLocaleString('ja-JP')}
          </div>
        </div>

        {currentFilter !== 'all' && (
          <div className="mb-4 flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-center space-x-2">
              <span className="text-blue-700 font-medium">
                🔍 フィルター: 
                {currentFilter === 'overdue' && ' 期限切れタスク'}
                {currentFilter === 'due-tomorrow' && ' 明日期限タスク'}
              </span>
              <span className="text-blue-600">
                {filteredTasks.length}件 / {stats.totalTasks}件
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
                {currentFilter === 'all' ? '📄' : '🔍'}
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

        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>
            📊 表示中: {filteredTasks.length}件 / 総タスク数: {stats.totalTasks}件 | サーバー停止:{' '}
            <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+C</kbd>
          </p>
        </div>
      </div>
    </div>
  );
}