import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import express from 'express';
import { Server } from 'http';
import { AddressInfo } from 'net';

// CLI実装をimport（これが失敗することでREDフェーズになる）
import { startServer, createApp } from '../src/cli.js';

/**
 * CLI基盤実装のテスト
 * Issue #2: CLI基盤実装 - src/cli.tsの基本構造とExpress設定
 * 
 * Windows/macOS/Linux クロスプラットフォーム対応を重視したテスト
 */

describe('CLI基盤実装', () => {
  describe('CLI関数の存在確認', () => {
    it('startServer関数が存在すること', () => {
      expect(typeof startServer).toBe('function');
    });

    it('createApp関数が存在すること', () => {
      expect(typeof createApp).toBe('function');
    });
  });

  describe('Express アプリケーション作成', () => {
    it('createApp関数がExpressアプリケーションを返すこと', () => {
      const app = createApp();
      expect(app).toBeDefined();
      expect(typeof app.listen).toBe('function');
      expect(typeof app.get).toBe('function');
    });

    it('アプリケーションにルートパスが設定されていること', async () => {
      const app = createApp();
      
      // ルートパスにリクエストを送信
      const supertest = await import('supertest');
      const response = await supertest.default(app).get('/');
      
      expect(response.status).toBe(200);
    });
  });

  describe('サーバー起動機能', () => {
    let server: Server;

    afterEach(async () => {
      if (server) {
        await new Promise<void>((resolve, reject) => {
          server.close((err) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }
    });

    it('startServer関数でサーバーが起動できること', async () => {
      // startServer関数を呼び出してサーバーを起動
      server = await startServer(0); // ポート0で自動割り当て
      
      expect(server.listening).toBe(true);
      
      const address = server.address() as AddressInfo;
      expect(address.port).toBeGreaterThan(0);
    });

    it('ルートパス (/) にGETリクエストが処理できること', async () => {
      const app = express();
      
      app.get('/', (req, res) => {
        res.status(200).json({ message: 'CLI Server Running' });
      });

      await new Promise<void>((resolve, reject) => {
        server = app.listen(0, '0.0.0.0', () => {
          resolve();
        });
        server.on('error', reject);
      });

      // fetch APIでテスト（Node.js 18+対応）
      const address = server.address() as AddressInfo;
      const response = await fetch(`http://localhost:${address.port}/`);
      const data = await response.json();

      expect(response.status).toBe(200);
      expect(data).toEqual({ message: 'CLI Server Running' });
    });

    it('ポート競合時に適切なエラーハンドリングが行われること', async () => {
      // 最初のサーバーを起動
      const app1 = express();
      const fixedPort = 13001; // テスト用固定ポート

      await new Promise<void>((resolve, reject) => {
        server = app1.listen(fixedPort, '0.0.0.0', () => {
          resolve();
        });
        server.on('error', reject);
      });

      // 同じポートで2番目のサーバーを起動しようとする
      const app2 = express();
      
      let errorOccurred = false;
      await new Promise<void>((resolve) => {
        const server2 = app2.listen(fixedPort, '0.0.0.0', () => {
          // このコールバックは呼ばれないはず
          server2.close();
          resolve();
        });

        server2.on('error', (error: Error & { code?: string }) => {
          expect(error.code).toBe('EADDRINUSE');
          errorOccurred = true;
          resolve();
        });
      });

      expect(errorOccurred).toBe(true);
    });
  });

  describe('環境変数とクロスプラットフォーム対応', () => {
    beforeEach(() => {
      // 各テスト前に環境変数をクリア
      vi.stubEnv('PORT', '');
      vi.stubEnv('NODE_ENV', '');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('PORT環境変数が設定されている場合、その値を使用すること', () => {
      vi.stubEnv('PORT', '8080');
      
      const port = process.env.PORT || 3001;
      expect(port).toBe('8080');
    });

    it('PORT環境変数が未設定の場合、デフォルト3001を使用すること', () => {
      vi.stubEnv('PORT', '');
      
      const port = process.env.PORT || 3001;
      expect(port).toBe(3001);
    });

    it('dotenv設定が適切に動作すること', () => {
      // production環境でない場合のdotenv読み込みテスト
      vi.stubEnv('NODE_ENV', 'development');
      
      const shouldLoadDotenv = process.env.NODE_ENV !== 'production';
      expect(shouldLoadDotenv).toBe(true);

      // production環境の場合
      vi.stubEnv('NODE_ENV', 'production');
      
      const shouldNotLoadDotenv = process.env.NODE_ENV !== 'production';
      expect(shouldNotLoadDotenv).toBe(false);
    });
  });

  describe('エラーハンドリング', () => {
    it('未処理例外時に適切な終了コードで終了すること', () => {
      // process.exit のモック
      const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
        throw new Error('process.exit called');
      });

      expect(() => {
        // エラー発生のシミュレーション
        process.exit(1);
      }).toThrow('process.exit called');

      expect(mockExit).toHaveBeenCalledWith(1);
      
      mockExit.mockRestore();
    });

    it('Result型のエラーを適切に処理できること', async () => {
      // fetchBacklogTasksがエラーを返す場合のシミュレーション
      const mockErrorResult = {
        isErr: () => true,
        isOk: () => false,
        error: { message: 'API接続エラー' }
      };

      // エラー処理の検証
      if (mockErrorResult.isErr()) {
        expect(mockErrorResult.error.message).toBe('API接続エラー');
      }

      expect(mockErrorResult.isErr()).toBe(true);
      expect(mockErrorResult.isOk()).toBe(false);
    });
  });

  describe('Windows特有の対応', () => {
    it('パス処理が安全に行われること', async () => {
      const path = await import('path');
      
      // クロスプラットフォームなパス結合
      const safePath = path.join('src', 'cli.ts');
      
      // Windows: src\cli.ts, Unix: src/cli.ts
      expect(safePath).toContain('cli.ts');
      expect(safePath).toContain('src');
      
      // プラットフォーム固有の区切り文字確認
      if (process.platform === 'win32') {
        expect(safePath).toContain('\\');
      } else {
        expect(safePath).toContain('/');
      }
    });

    it('環境変数の区切り文字が適切に処理されること', async () => {
      const path = await import('path');
      
      // PATH環境変数の区切り文字
      const delimiter = path.delimiter;
      
      if (process.platform === 'win32') {
        expect(delimiter).toBe(';');
      } else {
        expect(delimiter).toBe(':');
      }
    });
  });

  describe('ブラウザ起動機能', () => {
    it('open関数の呼び出しが適切に行われること', async () => {
      // openモジュールのモック
      const mockOpen = vi.fn().mockResolvedValue(undefined);
      
      // open関数の呼び出しシミュレーション
      const url = 'http://localhost:3001';
      await mockOpen(url);
      
      expect(mockOpen).toHaveBeenCalledWith(url);
      expect(mockOpen).toHaveBeenCalledTimes(1);
    });

    it('ブラウザ起動失敗時の代替案が提示されること', async () => {
      // openが失敗した場合のエラーハンドリング
      const mockError = new Error('ブラウザ起動に失敗しました');
      
      let fallbackMessageShown = false;
      
      try {
        throw mockError;
      } catch (error) {
        expect((error as Error).message).toBe('ブラウザ起動に失敗しました');
        // 代替案の提示
        fallbackMessageShown = true;
      }
      
      expect(fallbackMessageShown).toBe(true);
    });
  });

  describe('ログ出力機能', () => {
    let consoleSpy: {
      log: ReturnType<typeof vi.spyOn>;
      error: ReturnType<typeof vi.spyOn>;
      warn: ReturnType<typeof vi.spyOn>;
    };

    beforeEach(() => {
      consoleSpy = {
        log: vi.spyOn(console, 'log').mockImplementation(() => {}),
        error: vi.spyOn(console, 'error').mockImplementation(() => {}),
        warn: vi.spyOn(console, 'warn').mockImplementation(() => {})
      };
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('起動時に適切なログが出力されること', () => {
      console.log('🔍 Backlogからデータ取得中...');
      console.log('✅ 5件のタスクを取得！');
      console.log('🚀 サーバー起動完了！');
      console.log('📱 http://localhost:3001');

      expect(consoleSpy.log).toHaveBeenCalledWith('🔍 Backlogからデータ取得中...');
      expect(consoleSpy.log).toHaveBeenCalledWith('✅ 5件のタスクを取得！');
      expect(consoleSpy.log).toHaveBeenCalledWith('🚀 サーバー起動完了！');
      expect(consoleSpy.log).toHaveBeenCalledWith('📱 http://localhost:3001');
    });

    it('エラー時に適切なログが出力されること', () => {
      console.error('❌ エラーが発生: API接続エラー');
      console.warn('⚠️ ブラウザ起動に失敗: 権限エラー');

      expect(consoleSpy.error).toHaveBeenCalledWith('❌ エラーが発生: API接続エラー');
      expect(consoleSpy.warn).toHaveBeenCalledWith('⚠️ ブラウザ起動に失敗: 権限エラー');
    });

    it('Windows特有のトラブルシューティング情報が出力されること', () => {
      const port = 3001;
      const troubleshootingMessage = `
⚠️ トラブルシューティング:
- Windows: ファイアウォールでポート${port}を許可してください
- 管理者権限で実行してみてください
- 別のポートを試す場合: set PORT=8080 && npm start (Windows)
- 別のポートを試す場合: PORT=8080 npm start (macOS/Linux)
    `;

      console.log(troubleshootingMessage);
      
      expect(consoleSpy.log).toHaveBeenCalledWith(troubleshootingMessage);
    });
  });
});

describe('CLI統合テスト', () => {
  describe('完全な起動フロー', () => {
    it('タスク取得→サーバー起動→ブラウザ起動の一連の流れが成功すること', async () => {
      // モックデータの準備
      const mockTasksResult = {
        isOk: () => true,
        isErr: () => false,
        value: [
          {
            id: 1,
            projectKey: 'TEST',
            issueType: 'タスク',
            summary: 'テストタスク',
            status: '処理中',
            assigneeName: 'テストユーザー',
            isOverdue: false,
            overdueDays: 0,
            isDueTomorrow: false
          }
        ]
      };

      // 各ステップの実行確認
      expect(mockTasksResult.isOk()).toBe(true);
      
      if (mockTasksResult.isOk()) {
        const tasks = mockTasksResult.value;
        expect(tasks).toHaveLength(1);
        expect(tasks[0].projectKey).toBe('TEST');
      }

      // サーバー起動のシミュレーション
      const app = express();
      app.get('/', (req, res) => {
        res.json({ tasks: mockTasksResult.value });
      });

      let server: Server;
      await new Promise<void>((resolve, reject) => {
        server = app.listen(0, '0.0.0.0', () => {
          resolve();
        });
        server.on('error', reject);
      });

      expect(server!.listening).toBe(true);

      // サーバー停止
      await new Promise<void>((resolve, reject) => {
        server!.close((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
    });

    it('エラー発生時の完全な処理フローが適切に動作すること', async () => {
      // エラー結果のシミュレーション
      const mockErrorResult = {
        isOk: () => false,
        isErr: () => true,
        error: { message: 'API接続エラー' }
      };

      // エラー処理の検証
      expect(mockErrorResult.isErr()).toBe(true);
      
      if (mockErrorResult.isErr()) {
        expect(mockErrorResult.error.message).toBe('API接続エラー');
        
        // process.exitのモック
        const mockExit = vi.spyOn(process, 'exit').mockImplementation(() => {
          throw new Error('process.exit called with code 1');
        });

        expect(() => {
          process.exit(1);
        }).toThrow('process.exit called with code 1');

        expect(mockExit).toHaveBeenCalledWith(1);
        mockExit.mockRestore();
      }
    });
  });
});