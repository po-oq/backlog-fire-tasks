import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { ClientDashboard } from '../src/components/ClientDashboard.js';
import type { Task } from '../src/types.js';

// fetch APIのモック
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('ClientDashboard', () => {
  const createMockTask = (overrides: Partial<Task> = {}): Task => ({
    id: 1,
    projectKey: 'TEST',
    issueKey: 'TEST-1',
    issueType: 'タスク',
    summary: 'テストタスク',
    status: '未対応',
    assigneeName: 'テスト太郎',
    startDate: '2024-01-01',
    dueDate: '2024-12-31',
    updated: '2024-01-01T09:00:00Z',
    isOverdue: false,
    overdueDays: 0,
    isDueTomorrow: false,
    ...overrides
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('初期ローディング状態', () => {
    it('データ取得中はローディング画面を表示すること', () => {
      // fetch を無限に pending させる
      mockFetch.mockImplementation(() => new Promise(() => {}));
      
      render(<ClientDashboard />);
      
      expect(screen.getByText('⏳')).toBeInTheDocument();
      expect(screen.getByText('タスクを読み込み中...')).toBeInTheDocument();
      expect(screen.getByText('Backlog APIからデータを取得しています')).toBeInTheDocument();
    });
  });

  describe('正常なデータ取得', () => {
    it('APIからタスクを正常に取得して表示すること', async () => {
      const mockTasks: Task[] = [
        createMockTask({ id: 1, summary: 'タスク1', isOverdue: true, overdueDays: 3 }),
        createMockTask({ id: 2, summary: 'タスク2', isDueTomorrow: true }),
        createMockTask({ id: 3, summary: 'タスク3', status: '完了' })
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTasks)
      });

      render(<ClientDashboard backlogSpaceUrl="https://test.backlog.jp" />);
      
      await waitFor(() => {
        expect(screen.getByText('タスク管理ダッシュボード 📋')).toBeInTheDocument();
      });

      // 統計情報の確認
      expect(screen.getByText('📊 全て: 3件')).toBeInTheDocument();
      expect(screen.getByText('🔥 期限切れ: 1件')).toBeInTheDocument();
      expect(screen.getByText('⚠️ 明日期限: 1件')).toBeInTheDocument();
      
      // タスクカードの確認
      expect(screen.getByText('タスク1')).toBeInTheDocument();
      expect(screen.getByText('タスク2')).toBeInTheDocument();
      expect(screen.getByText('タスク3')).toBeInTheDocument();
    });
  });

  describe('エラーハンドリング', () => {
    it('APIエラー時はエラー画面を表示すること', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'API接続エラー' })
      });

      render(<ClientDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('❌')).toBeInTheDocument();
        expect(screen.getByText('エラーが発生しました')).toBeInTheDocument();
        expect(screen.getByText('API接続エラー')).toBeInTheDocument();
      });

      // 再読み込みボタンの確認
      expect(screen.getByText('再読み込み')).toBeInTheDocument();
    });

    it('ネットワークエラー時は適切なエラーメッセージを表示すること', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network Error'));

      render(<ClientDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('❌')).toBeInTheDocument();
        expect(screen.getByText('Network Error')).toBeInTheDocument();
      });
    });

    it('不正なJSONレスポンス時のエラーハンドリング', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({}) // error プロパティなし
      });

      render(<ClientDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('タスク取得に失敗しました')).toBeInTheDocument();
      });
    });
  });

  describe('フィルタリング機能', () => {
    const setupTasksWithFilters = async () => {
      const mockTasks: Task[] = [
        createMockTask({ id: 1, summary: '期限切れタスク', isOverdue: true, overdueDays: 5 }),
        createMockTask({ id: 2, summary: '明日期限タスク', isDueTomorrow: true }),
        createMockTask({ id: 3, summary: '通常タスク', isOverdue: false, isDueTomorrow: false }),
        createMockTask({ id: 4, summary: '完了タスク', status: '完了' })
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTasks)
      });

      render(<ClientDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('タスク管理ダッシュボード 📋')).toBeInTheDocument();
      });

      return mockTasks;
    };

    it('初期状態ではすべてのタスクが表示されること', async () => {
      await setupTasksWithFilters();
      
      expect(screen.getByText('期限切れタスク')).toBeInTheDocument();
      expect(screen.getByText('明日期限タスク')).toBeInTheDocument();
      expect(screen.getByText('通常タスク')).toBeInTheDocument();
      expect(screen.getByText('完了タスク')).toBeInTheDocument();
    });

    it('期限切れフィルターが正しく機能すること', async () => {
      await setupTasksWithFilters();
      
      const overdueButton = screen.getByText('🔥 期限切れ: 1件');
      fireEvent.click(overdueButton);
      
      await waitFor(() => {
        expect(screen.getByText('期限切れタスク')).toBeInTheDocument();
        expect(screen.queryByText('明日期限タスク')).not.toBeInTheDocument();
        expect(screen.queryByText('通常タスク')).not.toBeInTheDocument();
        expect(screen.queryByText('完了タスク')).not.toBeInTheDocument();
      });

      // フィルター表示の確認
      expect(screen.getByText('🔍 フィルター: 期限切れタスク')).toBeInTheDocument();
      expect(screen.getAllByText('1件 / 4件')[0]).toBeInTheDocument();
    });

    it('明日期限フィルターが正しく機能すること', async () => {
      await setupTasksWithFilters();
      
      const dueTomorrowButton = screen.getByText('⚠️ 明日期限: 1件');
      fireEvent.click(dueTomorrowButton);
      
      await waitFor(() => {
        expect(screen.getByText('明日期限タスク')).toBeInTheDocument();
        expect(screen.queryByText('期限切れタスク')).not.toBeInTheDocument();
        expect(screen.queryByText('通常タスク')).not.toBeInTheDocument();
        expect(screen.queryByText('完了タスク')).not.toBeInTheDocument();
      });

      // フィルター表示の確認
      expect(screen.getByText('🔍 フィルター: 明日期限タスク')).toBeInTheDocument();
      expect(screen.getAllByText('1件 / 4件')[0]).toBeInTheDocument();
    });

    it('すべて表示フィルターに戻れること', async () => {
      await setupTasksWithFilters();
      
      // 期限切れフィルターを適用
      const overdueButton = screen.getByText('🔥 期限切れ: 1件');
      fireEvent.click(overdueButton);
      
      await waitFor(() => {
        expect(screen.getByText('🔍 フィルター: 期限切れタスク')).toBeInTheDocument();
      });

      // すべて表示に戻す
      const showAllButton = screen.getByText('すべて表示');
      fireEvent.click(showAllButton);
      
      await waitFor(() => {
        expect(screen.getByText('期限切れタスク')).toBeInTheDocument();
        expect(screen.getByText('明日期限タスク')).toBeInTheDocument();
        expect(screen.getByText('通常タスク')).toBeInTheDocument();
        expect(screen.getByText('完了タスク')).toBeInTheDocument();
      });

      // フィルター表示が非表示になることを確認
      expect(screen.queryByText('🔍 フィルター:')).not.toBeInTheDocument();
    });

    it('フィルター結果が0件の場合、適切なメッセージを表示すること', async () => {
      const mockTasks: Task[] = [
        createMockTask({ id: 1, summary: '通常タスク', isOverdue: false, isDueTomorrow: false })
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTasks)
      });

      render(<ClientDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('タスク管理ダッシュボード 📋')).toBeInTheDocument();
      });

      // 期限切れフィルターを適用（該当なし）
      const overdueButton = screen.getByText('🔥 期限切れ: 0件');
      fireEvent.click(overdueButton);
      
      await waitFor(() => {
        expect(screen.getByText('🔍')).toBeInTheDocument();
        expect(screen.getByText('フィルター条件に該当するタスクがありません')).toBeInTheDocument();
        expect(screen.getByText('他のフィルターを試すか、すべて表示に戻してください')).toBeInTheDocument();
      });
    });
  });

  describe('空のタスクリスト', () => {
    it('タスクが0件の場合、適切なメッセージを表示すること', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([])
      });

      render(<ClientDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('📄')).toBeInTheDocument();
        expect(screen.getByText('タスクが見つかりません')).toBeInTheDocument();
        expect(screen.getByText(/環境変数の設定を確認してください/)).toBeInTheDocument();
        expect(screen.getByText(/\(MEMBER_KEYS, PROJECT_KEYS\)/)).toBeInTheDocument();
      });
    });
  });

  describe('UIインタラクション', () => {
    it('フィルターボタンがクリック時に適切なスタイルを持つこと', async () => {
      const mockTasks: Task[] = [
        createMockTask({ id: 1, isOverdue: true, overdueDays: 1 })
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTasks)
      });

      render(<ClientDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('🔥 期限切れ: 1件')).toBeInTheDocument();
      });

      const overdueButton = screen.getByText('🔥 期限切れ: 1件');
      
      // 初期状態（非選択）
      expect(overdueButton).toHaveClass('bg-red-100', 'text-red-800');
      
      // クリック後（選択状態）
      fireEvent.click(overdueButton);
      
      await waitFor(() => {
        expect(overdueButton).toHaveClass('bg-red-500', 'text-white', 'shadow-lg', 'transform', 'scale-105');
      });
    });

    it('最終更新時刻が表示されること', async () => {
      const mockTasks: Task[] = [createMockTask()];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTasks)
      });

      render(<ClientDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText(/最終更新:/)).toBeInTheDocument();
      });
    });
  });

  describe('Backlog URL連携', () => {
    it('backlogSpaceUrlが提供された場合、TaskCardに正しく渡されること', async () => {
      const mockTasks: Task[] = [
        createMockTask({ id: 1, summary: 'テストタスク', issueKey: 'TEST-123' })
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTasks)
      });

      render(<ClientDashboard backlogSpaceUrl="https://test.backlog.jp" />);
      
      await waitFor(() => {
        const linkElement = screen.getByRole('link', { name: 'テストタスク' });
        expect(linkElement).toHaveAttribute('href', 'https://test.backlog.jp/view/TEST-123');
      });
    });

    it('backlogSpaceUrlが未提供の場合でも正常に動作すること', async () => {
      const mockTasks: Task[] = [
        createMockTask({ id: 1, summary: 'テストタスク' })
      ];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTasks)
      });

      render(<ClientDashboard />);
      
      await waitFor(() => {
        expect(screen.getByText('テストタスク')).toBeInTheDocument();
        expect(screen.queryByRole('link', { name: 'テストタスク' })).not.toBeInTheDocument();
      });
    });
  });

  describe('レスポンシブデザイン', () => {
    it('適切なCSSクラスが適用されていること', async () => {
      const mockTasks: Task[] = [createMockTask()];

      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTasks)
      });

      render(<ClientDashboard />);
      
      await waitFor(() => {
        const mainContainer = screen.getByText('タスク管理ダッシュボード 📋').closest('div');
        expect(mainContainer?.parentElement).toHaveClass('min-h-screen', 'bg-gray-50', 'p-4');
      });
    });
  });
});