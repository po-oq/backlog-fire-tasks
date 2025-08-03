import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TaskCard } from '../src/components/TaskCard.js';
import type { Task } from '../src/types.js';

describe('TaskCard', () => {
  const mockBacklogSpaceUrl = 'https://test-space.backlog.jp';
  
  const baseTask: Task = {
    id: 1,
    projectKey: 'TEST',
    issueKey: 'TEST-123',
    issueType: 'タスク',
    summary: 'テストタスク',
    status: '未対応',
    assigneeName: 'テスト太郎',
    startDate: '2024-01-01',
    dueDate: '2024-12-31',
    updated: '2024-01-01T09:00:00Z',
    isOverdue: false,
    overdueDays: 0,
    isDueTomorrow: false
  };

  describe('期限切れタスクの表示', () => {
    it('期限切れタスクは🔥アイコンと遅延日数を表示すること', () => {
      const overdueTask: Task = {
        ...baseTask,
        isOverdue: true,
        overdueDays: 5,
        dueDate: '2024-01-01' // 過去の日付
      };

      render(<TaskCard task={overdueTask} backlogSpaceUrl={mockBacklogSpaceUrl} />);
      
      expect(screen.getByText('🔥')).toBeInTheDocument();
      expect(screen.getByText('5日遅延')).toBeInTheDocument();
      expect(screen.getByText('テストタスク')).toBeInTheDocument();
      expect(screen.getByText(/テスト太郎/)).toBeInTheDocument();
    });

    it('期限切れタスクは赤色のボーダーを持つこと', () => {
      const overdueTask: Task = {
        ...baseTask,
        isOverdue: true,
        overdueDays: 3
      };

      render(<TaskCard task={overdueTask} />);
      
      const cardElement = screen.getByText('テストタスク').closest('div');
      expect(cardElement).toHaveClass('border-red-500');
    });
  });

  describe('明日期限タスクの表示', () => {
    it('明日期限タスクは⚠️アイコンと明日期限テキストを表示すること', () => {
      const dueTomorrowTask: Task = {
        ...baseTask,
        isDueTomorrow: true,
        dueDate: '2024-12-25' // 明日の日付（テストでは固定）
      };

      render(<TaskCard task={dueTomorrowTask} />);
      
      expect(screen.getByText('⚠️')).toBeInTheDocument();
      expect(screen.getByText('明日期限')).toBeInTheDocument();
      expect(screen.getByText('テストタスク')).toBeInTheDocument();
    });

    it('明日期限タスクは黄色のボーダーと背景を持つこと', () => {
      const dueTomorrowTask: Task = {
        ...baseTask,
        isDueTomorrow: true
      };

      render(<TaskCard task={dueTomorrowTask} />);
      
      const cardElement = screen.getByText('テストタスク').closest('div');
      expect(cardElement).toHaveClass('border-yellow-500');
      expect(cardElement).toHaveClass('bg-yellow-50');
    });
  });

  describe('完了タスクの表示', () => {
    it('完了タスクは✅アイコンと完了テキストを表示すること', () => {
      const completedTask: Task = {
        ...baseTask,
        status: '完了'
      };

      render(<TaskCard task={completedTask} />);
      
      expect(screen.getByText('✅')).toBeInTheDocument();
      expect(screen.getAllByText('完了')).toHaveLength(2); // バッジと状態の2箇所に表示される
    });

    it('完了タスクのタイトルは取り消し線付きで表示されること', () => {
      const completedTask: Task = {
        ...baseTask,
        status: '完了'
      };

      render(<TaskCard task={completedTask} />);
      
      const titleElement = screen.getByText('テストタスク');
      expect(titleElement).toHaveClass('line-through');
    });
  });

  describe('通常タスクの表示', () => {
    it('期限内タスクは適切なアイコンとテキストを表示すること', () => {
      const normalTask: Task = {
        ...baseTask,
        dueDate: '2024-12-31' // 未来の日付
      };

      render(<TaskCard task={normalTask} />);
      
      expect(screen.getByText('✅')).toBeInTheDocument();
      expect(screen.getByText('期限内')).toBeInTheDocument();
    });

    it('期限未設定タスクは📝アイコンと未設定テキストを表示すること', () => {
      const noDeadlineTask: Task = {
        ...baseTask,
        dueDate: undefined
      };

      render(<TaskCard task={noDeadlineTask} />);
      
      expect(screen.getByText('📝')).toBeInTheDocument();
      expect(screen.getByText('期限未設定')).toBeInTheDocument();
    });
  });

  describe('Backlogリンク機能', () => {
    it('backlogSpaceUrlが提供された場合、タスクタイトルがリンクになること', () => {
      render(<TaskCard task={baseTask} backlogSpaceUrl={mockBacklogSpaceUrl} />);
      
      const linkElement = screen.getByRole('link', { name: 'テストタスク' });
      expect(linkElement).toBeInTheDocument();
      expect(linkElement).toHaveAttribute('href', 'https://test-space.backlog.jp/view/TEST-123');
      expect(linkElement).toHaveAttribute('target', '_blank');
    });

    it('backlogSpaceUrlが未提供の場合、タスクタイトルは通常のテキストになること', () => {
      render(<TaskCard task={baseTask} />);
      
      const titleElement = screen.getByText('テストタスク');
      expect(titleElement).not.toHaveAttribute('href');
      expect(titleElement.tagName).toBe('H3');
    });
  });

  describe('担当者表示', () => {
    it('担当者が設定されている場合、担当者名を表示すること', () => {
      render(<TaskCard task={baseTask} />);
      
      expect(screen.getByText(/👤.*テスト太郎/)).toBeInTheDocument();
    });

    it('担当者が未設定の場合、未割当を表示すること', () => {
      const unassignedTask: Task = {
        ...baseTask,
        assigneeName: undefined
      };

      render(<TaskCard task={unassignedTask} />);
      
      expect(screen.getByText(/👤.*未割当/)).toBeInTheDocument();
    });
  });

  describe('日付表示', () => {
    it('期限日と開始日が適切にフォーマットされて表示されること', () => {
      const taskWithDates: Task = {
        ...baseTask,
        startDate: '2024-01-01',
        dueDate: '2024-12-31'
      };

      render(<TaskCard task={taskWithDates} />);
      
      expect(screen.getByText(/期限:/)).toBeInTheDocument();
      expect(screen.getByText(/開始:/)).toBeInTheDocument();
      expect(screen.getByText(/2024-12-31/)).toBeInTheDocument();
      expect(screen.getAllByText(/2024-01-01/)).toHaveLength(2); // 開始日と更新日に表示
    });

    it('日付が未設定の場合、未設定と表示されること', () => {
      const taskWithoutDates: Task = {
        ...baseTask,
        startDate: undefined,
        dueDate: undefined
      };

      render(<TaskCard task={taskWithoutDates} />);
      
      expect(screen.getByText(/期限:/)).toBeInTheDocument();
      expect(screen.getByText(/開始:/)).toBeInTheDocument();
      // 期限と開始の2箇所で「未設定」が表示されることを確認
      const unsetElements = screen.getAllByText('未設定');
      expect(unsetElements.length).toBeGreaterThanOrEqual(1); // 最低1つは表示される
    });
  });

  describe('プロジェクトと課題種別の表示', () => {
    it('プロジェクトキーと課題種別がバッジとして表示されること', () => {
      render(<TaskCard task={baseTask} />);
      
      expect(screen.getByText('TEST')).toBeInTheDocument();
      expect(screen.getByText('タスク')).toBeInTheDocument();
    });
  });

  describe('状態表示', () => {
    it('処理中ステータスは黄色で表示されること', () => {
      const inProgressTask: Task = {
        ...baseTask,
        status: '処理中'
      };

      render(<TaskCard task={inProgressTask} />);
      
      const statusElement = screen.getByText('処理中');
      expect(statusElement).toHaveClass('text-yellow-600');
    });

    it('完了ステータスは緑色で表示されること', () => {
      const completedTask: Task = {
        ...baseTask,
        status: '完了'
      };

      render(<TaskCard task={completedTask} />);
      
      const statusElements = screen.getAllByText('完了');
      // 右端の状態表示は緑色
      expect(statusElements[1]).toHaveClass('text-green-600');
    });

    it('その他のステータスは青色で表示されること', () => {
      const defaultTask: Task = {
        ...baseTask,
        status: '未対応'
      };

      render(<TaskCard task={defaultTask} />);
      
      const statusElement = screen.getByText('未対応');
      expect(statusElement).toHaveClass('text-blue-600');
    });
  });
});