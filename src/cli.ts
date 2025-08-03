#!/usr/bin/env node

/**
 * Backlog Fire Tasks CLI
 * Issue #2: CLI基盤実装 - src/cli.tsの基本構造とExpress設定
 * 
 * Windows/macOS/Linux クロスプラットフォーム対応
 */

import React from 'react';
import { renderToString } from 'react-dom/server';
import express from 'express';
import open from 'open';
import dotenv from 'dotenv';
import { fetchBacklogTasks, getBacklogConfig } from './api.js';
import type { Task } from './types.js';
import { Server } from 'http';
import { Dashboard } from './components/Dashboard.js';

// 環境変数読み込み（Windows/Unix共通）
if (process.env.NODE_ENV !== 'production') {
  dotenv.config();
}

/**
 * Express アプリケーションを作成
 * テスト可能にするため分離
 */
export function createApp(tasks: Task[] = [], backlogSpaceUrl?: string): express.Application {
  const app = express();
  
  app.get('/', (req, res) => {
    // React Dashboard コンポーネントをSSRでレンダリング
    const dashboardHTML = renderToString(
      React.createElement(Dashboard, { 
        tasks, 
        lastUpdated: new Date(),
        backlogSpaceUrl 
      })
    );
    
    // 完全なHTMLドキュメントとして送信
    res.send(`<!DOCTYPE html>${dashboardHTML}`);
  });

  return app;
}

/**
 * サーバーを起動
 * テスト可能にするため分離
 */
export function startServer(port: number = 0): Promise<Server> {
  return new Promise((resolve, reject) => {
    // 一時的な空のタスクでアプリケーションを作成
    const appWithRoutes = createApp([]);
    
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
    // Result型の適切な処理
    const tasksResult = await fetchBacklogTasks();
    if (tasksResult.isErr()) {
      console.error(`❌ エラーが発生: ${tasksResult.error.message}`);
      process.exit(1);
    }
    
    const tasks = tasksResult.value;
    console.log(`✅ ${tasks.length}件のタスクを取得！`);

    // Backlog設定を取得（スペースURLの取得）
    const configResult = getBacklogConfig();
    const backlogSpaceUrl = configResult.isOk() ? configResult.value.spaceUrl : undefined;

    // Express アプリケーション作成
    const app = createApp(tasks, backlogSpaceUrl);
    
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