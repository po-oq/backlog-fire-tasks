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
  
  // 静的ファイル配信（bundleされたJSファイル）
  app.use(express.static('public'));
  
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
  
  // TypeScriptコンポーネント版（フィルタリング機能付き）
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
  
  <script>
    // TypeScriptコンポーネント用の設定をグローバルに設定
    window.BACKLOG_SPACE_URL = "${backlogSpaceUrl || ''}";
  </script>
  <script src="/bundle.js"></script>
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
// テスト時は実行されない
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}