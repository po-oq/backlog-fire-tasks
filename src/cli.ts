#!/usr/bin/env node

/**
 * Backlog Fire Tasks CLI
 * Issue #2: CLI基盤実装 - src/cli.tsの基本構造とExpress設定
 * 
 * Windows/macOS/Linux クロスプラットフォーム対応
 */

import express from 'express';
import open from 'open';
import dotenv from 'dotenv';
import { fetchBacklogTasks, getBacklogConfig } from './api.js';
import { Server } from 'http';
// 環境変数読み込み（Windows/Unix共通）
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

/**
 * Express アプリケーションを作成
 * テスト可能にするため分離
 */
export function createApp(backlogSpaceUrl?: string): express.Application {
  const app = express();
  
  // API エンドポイント
  app.get('/api/tasks', async (req, res) => {
    try {
      const tasksResult = await fetchBacklogTasks();
      if (tasksResult.isErr()) {
        return res.status(500).json({ 
          error: tasksResult.error.message 
        });
      }
      res.json(tasksResult.value);
    } catch (error) {
      res.status(500).json({ 
        error: `タスク取得エラー: ${(error as Error).message}` 
      });
    }
  });
  
// CSR版（新しいフィルタリング機能付き）
  app.get('/', (req, res) => {
    res.send(generateClientHTML(backlogSpaceUrl));
  });

  return app;
}

/**
 * クライアントサイド用のHTMLページを生成
 */
function generateClientHTML(backlogSpaceUrl?: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Backlog Tasks 🔥</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <script src="https://unpkg.com/react@18/umd/react.development.js"></script>
  <script src="https://unpkg.com/react-dom@18/umd/react-dom.development.js"></script>
  <script src="https://unpkg.com/@babel/standalone/babel.min.js"></script>
  <meta charset="UTF-8" />
  <style>
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
  </style>
</head>
<body>
  <div id="root"></div>
  
  <script type="text/babel">
    const { useState, useEffect } = React;
    
    // TaskCard コンポーネント
    const TaskCard = ({ task, backlogSpaceUrl }) => {
      const formatDateWithDayOfWeek = (dateString) => {
        if (!dateString) return '未設定';
        
        try {
          const date = new Date(dateString);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          
          const dayNames = ['日', '月', '火', '水', '木', '金', '土'];
          const dayOfWeek = dayNames[date.getDay()];
          
          return \`\${year}-\${month}-\${day}(\${dayOfWeek})\`;
        } catch {
          return dateString;
        }
      };

      const generateBacklogUrl = (spaceUrl, issueKey) => {
        const baseUrl = spaceUrl.replace(/\\/$/, '');
        return \`\${baseUrl}/view/\${issueKey}\`;
      };

      const getStatusConfig = () => {
        if (task.isOverdue) {
          return {
            icon: '🔥',
            borderColor: 'border-red-500',
            bgColor: '',
            badgeColor: 'bg-red-100 text-red-800',
            badgeText: \`\${task.overdueDays}日遅延\`,
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
      
      const getStatusColor = () => {
        if (task.status === '完了') return 'text-green-600';
        if (task.status === '処理中') return 'text-yellow-600';
        return 'text-blue-600';
      };

      const renderTaskTitle = () => {
        const titleClasses = \`text-sm font-semibold text-gray-800 mb-2 truncate \${
          task.status === '完了' ? 'line-through' : ''
        }\`;
        
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
      };

      return (
        <div className={\`bg-white rounded-lg shadow-md p-3 border-l-4 hover:shadow-lg transition-all duration-200 \${config.borderColor} \${config.bgColor} \${config.hoverBg}\`}>
          <div className="flex justify-between items-start mb-2">
            <div className="flex items-center space-x-2">
              <span className={\`text-xl \${config.iconAnimation}\`}>
                {config.icon}
              </span>
              <span className={\`text-xs px-2 py-1 rounded font-medium \${config.badgeColor}\`}>
                {config.badgeText}
              </span>
              <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                {task.projectKey}
              </span>
              <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                {task.issueType}
              </span>
            </div>
            <span className={\`text-xs font-medium \${getStatusColor()}\`}>
              {task.status}
            </span>
          </div>

          {renderTaskTitle()}

          <div className="flex justify-between items-center text-xs text-gray-600">
            <div className="flex items-center space-x-3">
              <span>👤 {task.assigneeName || '未割当'}</span>
              <span>
                期限:{' '}
                <span className={\`font-medium \${config.dueDateColor}\`}>
                  {formatDateWithDayOfWeek(task.dueDate)}
                </span>
              </span>
              <span>開始: {formatDateWithDayOfWeek(task.startDate)}</span>
            </div>
            <span>更新: {formatDateWithDayOfWeek(task.updated)}</span>
          </div>
        </div>
      );
    };
    
    // ClientDashboard コンポーネント
    const ClientDashboard = ({ backlogSpaceUrl }) => {
      const [tasks, setTasks] = useState([]);
      const [filteredTasks, setFilteredTasks] = useState([]);
      const [currentFilter, setCurrentFilter] = useState('all');
      const [loading, setLoading] = useState(true);
      const [error, setError] = useState(null);
      const [lastUpdated, setLastUpdated] = useState(new Date());

      useEffect(() => {
        const fetchTasks = async () => {
          try {
            setLoading(true);
            const response = await fetch('/api/tasks');
            
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'タスク取得に失敗しました');
            }
            
            const tasksData = await response.json();
            setTasks(tasksData);
            setLastUpdated(new Date());
            setError(null);
          } catch (err) {
            setError(err.message);
          } finally {
            setLoading(false);
          }
        };

        fetchTasks();
      }, []);

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

      const totalTasks = tasks.length;
      const overdueTasks = tasks.filter(task => task.isOverdue).length;
      const dueTomorrowTasks = tasks.filter(task => task.isDueTomorrow).length;


      const handleFilterClick = (filter) => {
        setCurrentFilter(filter);
      };

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
                  className={\`px-2 py-1 rounded text-sm font-medium transition-all duration-200 \${
                    currentFilter === 'all'
                      ? 'bg-green-200 text-green-900 shadow-md'
                      : 'bg-green-100 text-green-800 hover:bg-green-200 hover:shadow-md'
                  }\`}
                >
                  📊 取得: {totalTasks}件
                </button>
                
                <button
                  onClick={() => handleFilterClick('overdue')}
                  className={\`px-2 py-1 rounded text-sm font-medium transition-all duration-200 \${
                    currentFilter === 'overdue'
                      ? 'bg-red-200 text-red-900 shadow-md'
                      : 'bg-red-100 text-red-800 hover:bg-red-200 hover:shadow-md'
                  }\`}

                >
                  🔥 期限切れ: {overdueTasks}件
                </button>
                
                <button
                  onClick={() => handleFilterClick('due-tomorrow')}
                  className={\`px-2 py-1 rounded text-sm font-medium transition-all duration-200 \${
                    currentFilter === 'due-tomorrow'
                      ? 'bg-yellow-200 text-yellow-900 shadow-md'
                      : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200 hover:shadow-md'
                  }\`}

                >
                  ⚠️ 明日期限: {dueTomorrowTasks}件
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
                    {currentFilter === 'completed' && ' 完了タスク'}
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
    
    // アプリをマウント
    ReactDOM.render(
      <ClientDashboard backlogSpaceUrl="${backlogSpaceUrl || ''}" />, 
      document.getElementById('root')
    );
  </script>
</body>
</html>`;
}

/**
 * サーバーを起動
 * テスト可能にするため分離
 */
export function startServer(port: number = 0): Promise<Server> {
  return new Promise((resolve, reject) => {
    // 一時的な空のタスクでアプリケーションを作成
    const appWithRoutes = createApp();
    
    const server = appWithRoutes.listen(port, '0.0.0.0', () => {
      resolve(server);
    });
    
    server.on('error', reject);
  });
}

/**
 * メイン関数：タスク取得→サーバー起動→ブラウザ起動
 */
async function main() {
  console.log('🔍 Backlogからデータ取得中...');
  
  try {
    // APIは /api/tasks エンドポイントで提供
    console.log('✅ サーバー準備完了！');
    // Backlog設定を取得（スペースURLの取得）
    const configResult = getBacklogConfig();
    const backlogSpaceUrl = configResult.isOk() ? configResult.value.spaceUrl : undefined;

    // Express アプリケーション作成
    const app = createApp(backlogSpaceUrl);
    
    // ポート設定（環境変数 または デフォルト3001）
    const PORT = Number(process.env.PORT) || 3001;

    // Windows互換: 0.0.0.0でbind
    const server = app.listen(PORT, '0.0.0.0', async () => {
      console.log(`🚀 サーバー起動完了！`);
      console.log(`📱 http://localhost:${PORT}`);
      
      // Windows対応ブラウザ起動
      try {
        await open(`http://localhost:${PORT}`);
        console.log('📱 ブラウザを起動しました');
      } catch (error) {
        console.warn(`⚠️ ブラウザ起動に失敗: ${(error as Error).message}`);
        console.log(`📱 手動でアクセス: http://localhost:${PORT}`);
      }
    });

    // サーバーエラーハンドリング
    server.on('error', (error: Error & { code?: string }) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ ポート${PORT}は既に使用中です`);
        console.log(`
⚠️ トラブルシューティング:
- 別のポートを試す: set PORT=8080 && npm start (Windows)
- 別のポートを試す: PORT=8080 npm start (macOS/Linux)
- または: npx cross-env PORT=8080 npm start (クロスプラットフォーム)
        `);
      } else {
        console.error(`❌ サーバーエラー: ${error.message}`);
        console.log(`
⚠️ トラブルシューティング:
- Windows: ファイアウォールでポート${PORT}を許可してください
- 管理者権限で実行してみてください
- ポートが利用可能か確認: netstat -ano | findstr :${PORT} (Windows)
- ポートが利用可能か確認: lsof -i :${PORT} (macOS/Linux)
        `);
      }
      process.exit(1);
    });
    
  } catch (error) {
    console.error(`❌ 予期しないエラー: ${(error as Error).message}`);
    const PORT = Number(process.env.PORT) || 3001;
    console.log(`
⚠️ トラブルシューティング:
- 環境変数の設定を確認してください (.env ファイル)
- Windows: ファイアウォールでポート${PORT}を許可してください
- 管理者権限で実行してみてください
- 別のポートを試す場合: set PORT=8080 && npm start (Windows)
- 別のポートを試す場合: PORT=8080 npm start (macOS/Linux)
    `);
    process.exit(1);
  }
}

// CLI として実行された場合のみ main() を実行
// テスト環境では実行しない (標準的な手法)
if (process.env.NODE_ENV !== 'test') {
  main();
}