import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DashboardStats } from '../src/components/DashboardStats.js';
import type { Task } from '../src/types.js';

describe('DashboardStats', () => {
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

  describe('統計情報の計算と表示', () => {
    it('空のタスク配列の場合、すべて0件と表示されること', () => {
      const lastUpdated = new Date('2024-01-01T12:00:00Z');
      
      render(<DashboardStats tasks={[]} lastUpdated={lastUpdated} />);
      
      expect(screen.getByText(/📊 取得: 0件/)).toBeInTheDocument();
      expect(screen.getByText(/🔥 期限切れ: 0件/)).toBeInTheDocument();
      expect(screen.getByText(/⚠️ 明日期限: 0件/)).toBeInTheDocument();
      // 完了タスクが0件の場合は表示されない（条件付きレンダリング）
    });

    it('様々な状態のタスクを正しく集計すること', () => {
      const tasks: Task[] = [
        createMockTask({ isOverdue: true, overdueDays: 5 }),
        createMockTask({ isOverdue: true, overdueDays: 2 }),
        createMockTask({ isDueTomorrow: true }),
        createMockTask({ isDueTomorrow: true }),
        createMockTask({ isDueTomorrow: true }),
        createMockTask({ status: '完了' }),
        createMockTask({ status: '完了' }),
        createMockTask({ status: '処理中' }),
        createMockTask({ status: '未対応' })
      ];
      
      const lastUpdated = new Date('2024-01-01T12:00:00Z');
      
      render(<DashboardStats tasks={tasks} lastUpdated={lastUpdated} />);
      
      expect(screen.getByText(/📊 取得: 9件/)).toBeInTheDocument();
      expect(screen.getByText(/🔥 期限切れ: 2件/)).toBeInTheDocument();
      expect(screen.getByText(/⚠️ 明日期限: 3件/)).toBeInTheDocument();
      expect(screen.getByText(/✨ 完了: 2件/)).toBeInTheDocument();
    });

    it('重複条件（期限切れ + 完了など）も正しく処理すること', () => {
      const tasks: Task[] = [
        createMockTask({ isOverdue: true, status: '完了' }), // 期限切れだが完了済み
        createMockTask({ isDueTomorrow: true, status: '完了' }), // 明日期限だが完了済み
        createMockTask({ isOverdue: true, isDueTomorrow: false }), // 期限切れのみ
        createMockTask({ isDueTomorrow: true, isOverdue: false }) // 明日期限のみ
      ];
      
      const lastUpdated = new Date('2024-01-01T12:00:00Z');
      
      render(<DashboardStats tasks={tasks} lastUpdated={lastUpdated} />);
      
      expect(screen.getByText(/📊 取得: 4件/)).toBeInTheDocument();
      expect(screen.getByText(/🔥 期限切れ: 2件/)).toBeInTheDocument(); // 完了済みでも期限切れカウント
      expect(screen.getByText(/⚠️ 明日期限: 2件/)).toBeInTheDocument(); // 完了済みでも明日期限カウント
      expect(screen.getByText(/✨ 完了: 2件/)).toBeInTheDocument();
    });
  });

  describe('最終更新時刻の表示', () => {
    it('lastUpdatedが提供された場合、日本語フォーマットで表示されること', () => {
      const tasks: Task[] = [createMockTask()];
      const lastUpdated = new Date('2024-01-01T12:30:45Z');
      
      render(<DashboardStats tasks={tasks} lastUpdated={lastUpdated} />);
      
      // 日本語ロケールでフォーマットされた時刻が表示されること
      expect(screen.getByText(/最終更新:/)).toBeInTheDocument();
      expect(screen.getByText(/2024/)).toBeInTheDocument();
    });

    it('lastUpdatedが未提供の場合、デフォルトで現在時刻が使われること', () => {
      const tasks: Task[] = [createMockTask()];
      
      render(<DashboardStats tasks={tasks} />);
      
      expect(screen.getByText(/最終更新:/)).toBeInTheDocument();
    });
  });

  describe('バッジのスタイリング', () => {
    it('各統計バッジが適切なスタイルクラスを持つこと', () => {
      const tasks: Task[] = [
        createMockTask({ isOverdue: true }),
        createMockTask({ isDueTomorrow: true }),
        createMockTask({ status: '完了' }),
        createMockTask()
      ];
      
      const lastUpdated = new Date('2024-01-01T12:00:00Z');
      
      render(<DashboardStats tasks={tasks} lastUpdated={lastUpdated} />);
      
      // 総取得数バッジ（緑）
      const totalBadge = screen.getByText(/📊 取得: 4件/);
      expect(totalBadge).toHaveClass('bg-green-100', 'text-green-800');
      
      // 期限切れバッジ（赤）
      const overdueBadge = screen.getByText(/🔥 期限切れ: 1件/);
      expect(overdueBadge).toHaveClass('bg-red-100', 'text-red-800');
      
      // 明日期限バッジ（黄）
      const dueTomorrowBadge = screen.getByText(/⚠️ 明日期限: 1件/);
      expect(dueTomorrowBadge).toHaveClass('bg-yellow-100', 'text-yellow-800');
      
      // 完了バッジ（青）
      const completedBadge = screen.getByText(/✨ 完了: 1件/);
      expect(completedBadge).toHaveClass('bg-blue-100', 'text-blue-800');
    });
  });

  describe('レスポンシブレイアウト', () => {
    it('統計情報と更新時刻が適切に配置されること', () => {
      const tasks: Task[] = [createMockTask()];
      const lastUpdated = new Date('2024-01-01T12:00:00Z');
      
      render(<DashboardStats tasks={tasks} lastUpdated={lastUpdated} />);
      
      // メインコンテナが適切なレイアウトクラスを持つこと
      const container = screen.getByText(/📊 取得: 1件/).closest('div');
      expect(container?.parentElement).toHaveClass('mb-4', 'flex', 'justify-between', 'items-center');
    });
  });

  describe('エッジケース', () => {
    it('大量のタスクでも正しく集計されること', () => {
      const tasks: Task[] = Array.from({ length: 1000 }, (_, i) => 
        createMockTask({
          id: i + 1,
          isOverdue: i % 3 === 0,
          isDueTomorrow: i % 5 === 0,
          status: i % 7 === 0 ? '完了' : '未対応'
        })
      );
      
      const lastUpdated = new Date('2024-01-01T12:00:00Z');
      
      render(<DashboardStats tasks={tasks} lastUpdated={lastUpdated} />);
      
      expect(screen.getByText(/📊 取得: 1000件/)).toBeInTheDocument();
      expect(screen.getByText(/🔥 期限切れ: \d+件/)).toBeInTheDocument();
      expect(screen.getByText(/⚠️ 明日期限: \d+件/)).toBeInTheDocument();
      expect(screen.getByText(/✨ 完了: \d+件/)).toBeInTheDocument();
    });

    it('undefinedや不正な値に対して適切に処理すること', () => {
      const tasks: Task[] = [
        createMockTask({ assigneeName: undefined }),
        createMockTask({ dueDate: undefined }),
        createMockTask({ startDate: undefined })
      ];
      
      const lastUpdated = new Date('2024-01-01T12:00:00Z');
      
      render(<DashboardStats tasks={tasks} lastUpdated={lastUpdated} />);
      
      expect(screen.getByText(/📊 取得: 3件/)).toBeInTheDocument();
      // エラーが発生せずに正常に描画されることを確認
    });
  });
});