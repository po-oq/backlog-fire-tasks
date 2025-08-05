import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  calculateOverdueStatus,
  transformIssueToTask,
  isCompletedStatus,
  getActiveStatusIds,
  fetchIssues,
  fetchProjects,
  fetchProjectStatuses,
  fetchUsers,
  fetchBacklogTasks,
  api
} from '../src/api.js';

// getBacklogConfig は内部関数なので、型のみimport
// import { getBacklogConfig } from '../src/api.js';
import type { BacklogIssue, BacklogProject } from '../src/types.js';

describe('calculateOverdueStatus', () => {
  it('未来の日付の場合、期限切れではないこと', () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const futureDateStr = tomorrow.toISOString().split('T')[0];
    
    const result = calculateOverdueStatus(futureDateStr);
    
    expect(result).toEqual({
      isOverdue: false,
      overdueDays: 0,
      isDueTomorrow: true
    });
  });

  it('過去の日付の場合、期限切れであること', () => {
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
    const pastDateStr = threeDaysAgo.toISOString().split('T')[0];
    
    const result = calculateOverdueStatus(pastDateStr);
    
    expect(result).toEqual({
      isOverdue: true,
      overdueDays: 3,
      isDueTomorrow: false
    });
  });

  it('期限日が未設定の場合、期限切れではないこと', () => {
    const result = calculateOverdueStatus();
    
    expect(result).toEqual({
      isOverdue: false,
      overdueDays: 0,
      isDueTomorrow: false
    });
  });

  it('今日の日付の場合、期限切れではないこと', () => {
    const todayStr = new Date().toISOString().split('T')[0];
    
    const result = calculateOverdueStatus(todayStr);
    
    expect(result).toEqual({
      isOverdue: false,
      overdueDays: 0,
      isDueTomorrow: false
    });
  });
});

describe('transformIssueToTask', () => {
  it('BacklogIssueをTaskに変換できること', () => {
    const mockIssue: BacklogIssue = {
      id: 123,
      projectId: 456,
      issueKey: 'TEST-123',
      issueType: { id: 1, name: 'タスク' },
      summary: 'テストタスク',
      status: { id: 1, name: '処理中' },
      assignee: { id: 789, name: '田中太郎' },
      startDate: '2024-01-01',
      dueDate: '2024-01-31',
      updated: '2024-01-15T09:00:00Z'
    };

    const result = transformIssueToTask(mockIssue, 'TEST');

    expect(result).toEqual({
      id: 123,
      projectKey: 'TEST',
      issueKey: 'TEST-123',
      issueType: 'タスク',
      summary: 'テストタスク',
      status: '処理中',
      assigneeName: '田中太郎',
      startDate: '2024-01-01',
      dueDate: '2024-01-31',
      updated: '2024/01/15 18:00',
      isOverdue: true,
      overdueDays: expect.any(Number),
      isDueTomorrow: false,
      parentTask: undefined
    });
  });

  it('担当者なしの課題を適切に処理できること', () => {
    const mockIssue: BacklogIssue = {
      id: 123,
      projectId: 456,
      issueKey: 'BUG-123',
      issueType: { id: 1, name: 'バグ' },
      summary: 'テストバグ',
      status: { id: 2, name: '未対応' },
      startDate: '2024-01-01',
      updated: '2024-01-15T09:00:00Z'
    };

    const result = transformIssueToTask(mockIssue, 'BUG');

    expect(result).toEqual({
      id: 123,
      projectKey: 'BUG',
      issueKey: 'BUG-123',
      issueType: 'バグ',
      summary: 'テストバグ',
      status: '未対応',
      assigneeName: undefined,
      startDate: '2024-01-01',
      dueDate: undefined,
      updated: '2024/01/15 18:00',
      isOverdue: false,
      overdueDays: 0,
      isDueTomorrow: false,
      parentTask: undefined
    });
  });

  it('親子タスクの関係を正しく解決できること', () => {
    const parentIssue: BacklogIssue = {
      id: 100,
      projectId: 456,
      issueKey: 'TEST-100',
      issueType: { id: 1, name: 'タスク' },
      summary: '親タスク',
      status: { id: 1, name: '処理中' },
      assignee: { id: 789, name: '田中太郎' },
      startDate: '2024-01-01',
      dueDate: '2024-12-31',
      updated: '2024-01-15T09:00:00Z'
    };

    const childIssue: BacklogIssue = {
      id: 101,
      projectId: 456,
      issueKey: 'TEST-101',
      issueType: { id: 2, name: 'サブタスク' },
      summary: '子タスク',
      status: { id: 1, name: '処理中' },
      assignee: { id: 789, name: '田中太郎' },
      startDate: '2024-01-01',
      dueDate: '2024-01-31',
      updated: '2024-01-15T09:00:00Z',
      parentIssueId: 100  // 親課題IDを設定
    };

    const allIssues = [parentIssue, childIssue];
    
    // 親タスクの変換（親課題なし）
    const parentTask = transformIssueToTask(parentIssue, 'TEST', allIssues);
    expect(parentTask.parentTask).toBeUndefined();

    // 子タスクの変換（親課題情報が設定される）
    const childTask = transformIssueToTask(childIssue, 'TEST', allIssues);
    expect(childTask.parentTask).toEqual({
      id: 100,
      issueKey: 'TEST-100',
      summary: '親タスク'
    });
  });

  it('存在しない親課題IDの場合、parentTaskはundefinedになること', () => {
    const childIssue: BacklogIssue = {
      id: 101,
      projectId: 456,
      issueKey: 'TEST-101',
      issueType: { id: 2, name: 'サブタスク' },
      summary: '子タスク',
      status: { id: 1, name: '処理中' },
      startDate: '2024-01-01',
      updated: '2024-01-15T09:00:00Z',
      parentIssueId: 999  // 存在しない親課題ID
    };

    const allIssues = [childIssue];  // 親課題は含まれていない
    
    const result = transformIssueToTask(childIssue, 'TEST', allIssues);
    expect(result.parentTask).toBeUndefined();
  });
});

// 状態フィルタリング関数のテスト
describe('Status filtering functions', () => {
  describe('isCompletedStatus', () => {
    it('日本語の完了状態名を識別できること', () => {
      expect(isCompletedStatus('完了')).toBe(true);
      expect(isCompletedStatus('完成')).toBe(true);
      expect(isCompletedStatus('処理中')).toBe(false);
      expect(isCompletedStatus('未対応')).toBe(false);
    });

    it('英語の完了状態名を識別できること', () => {
      expect(isCompletedStatus('Done')).toBe(true);
      expect(isCompletedStatus('Closed')).toBe(true);
      expect(isCompletedStatus('Close')).toBe(true);
      expect(isCompletedStatus('In Progress')).toBe(false);
      expect(isCompletedStatus('Open')).toBe(false);
    });

    it('大文字小文字を区別しないこと', () => {
      expect(isCompletedStatus('DONE')).toBe(true);
      expect(isCompletedStatus('done')).toBe(true);
      expect(isCompletedStatus('DoNe')).toBe(true);
      expect(isCompletedStatus('CLOSED')).toBe(true);
      expect(isCompletedStatus('完了')).toBe(true);
    });
  });

  describe('getActiveStatusIds', () => {
    it('プロジェクトIDが空の場合、空配列を返すこと', async () => {
      const result = await getActiveStatusIds([]);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(result.value).toEqual([]);
      }
    });

    it('全プロジェクトで状態取得に失敗した場合、空配列を返すこと', async () => {
      // 環境変数なしで実行→全プロジェクトでエラー→空配列返却
      const result = await getActiveStatusIds([1, 2, 3]);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value).toEqual([]);
      }
    });

    it('単一プロジェクトでのエラーを適切に処理できること', async () => {
      // 単一プロジェクトでもエラー処理されることを確認
      const result = await getActiveStatusIds([999]);
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        expect(Array.isArray(result.value)).toBe(true);
        expect(result.value).toEqual([]);
      }
    });
  });
});

// getBacklogConfig関数のテスト
describe('getBacklogConfig', () => {
  describe('without environment variables', () => {
    beforeEach(() => {
      vi.stubEnv('BACKLOG_SPACE_URL', '');
      vi.stubEnv('BACKLOG_API_KEY', '');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it.skip('環境変数が不足している場合、エラーを返すこと', () => {
      // Note: getBacklogConfig needs to be exported and converted to neverthrow first
      // This test will be implemented after getBacklogConfig is available
    });
  });

  describe('with valid environment variables', () => {
    beforeEach(() => {
      vi.stubEnv('BACKLOG_SPACE_URL', 'https://test.backlog.jp');
      vi.stubEnv('BACKLOG_API_KEY', 'test-api-key');
      vi.stubEnv('PROJECT_KEYS', 'TEST1,TEST2');
      vi.stubEnv('MEMBER_KEYS', 'user1,user2');
      vi.stubEnv('TASK_LIMIT', '200');
      vi.stubEnv('SERVER_PORT', '4000');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it.skip('環境変数が設定されている場合、有効な設定を返すこと', () => {
      // Note: getBacklogConfig needs to be exported and converted to neverthrow first
      // This test will be implemented after getBacklogConfig is available
    });
  });
});

// API関数のテスト（環境変数エラーを統合テスト）
describe('Backlog API functions', () => {
  // 環境変数がない状態での統合テスト
  describe('without environment variables', () => {
    beforeEach(() => {
      // 環境変数をクリア
      vi.stubEnv('BACKLOG_SPACE_URL', '');
      vi.stubEnv('BACKLOG_API_KEY', '');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
    });

    it('環境変数なしの場合、全API関数でエラーを返すこと', async () => {
      // 全API関数で同じ環境変数エラーが発生することを確認
      const expectedError = '環境変数 BACKLOG_SPACE_URL と BACKLOG_API_KEY が必要です';
      
      const results = await Promise.all([
        fetchIssues(),
        fetchProjects(), 
        fetchProjectStatuses(123),
        fetchUsers(),
        fetchBacklogTasks()
      ]);

      // 全ての結果がエラーであることを確認
      results.forEach((result, index) => {
        const functionNames = ['fetchIssues', 'fetchProjects', 'fetchProjectStatuses', 'fetchUsers', 'fetchBacklogTasks'];
        expect(result.isErr(), `${functionNames[index]} should return error`).toBe(true);
        
        if (result.isErr()) {
          expect(result.error.message, `${functionNames[index]} should have correct error message`).toBe(expectedError);
        }
      });
    });
  });

  // 統合テスト：fetchBacklogTasks の正常系
  describe('fetchBacklogTasks integration', () => {
    beforeEach(() => {
      // 環境変数をモック
      vi.stubEnv('BACKLOG_SPACE_URL', 'https://test.backlog.jp');
      vi.stubEnv('BACKLOG_API_KEY', 'test-api-key');
      vi.stubEnv('PROJECT_KEYS', 'TEST1,TEST2');
      vi.stubEnv('MEMBER_KEYS', 'user1,user2');
    });

    afterEach(() => {
      vi.unstubAllEnvs();
      vi.restoreAllMocks();
    });

    it('タスクの取得と変換が正常に実行されること', async () => {
      // モックデータ準備
      const mockProjects: BacklogProject[] = [
        { id: 1, projectKey: 'TEST1', name: 'テストプロジェクト1' },
        { id: 2, projectKey: 'TEST2', name: 'テストプロジェクト2' }
      ];

      const mockIssues: BacklogIssue[] = [
        {
          id: 101,
          projectId: 1,
          issueKey: 'TEST1-101',
          issueType: { id: 1, name: 'タスク' },
          summary: 'テストタスク1',
          status: { id: 1, name: '処理中' },
          assignee: { id: 201, name: '田中太郎' },
          startDate: '2024-01-01',
          dueDate: '2025-12-31',
          updated: '2024-01-15T09:00:00Z'
        },
        {
          id: 102,
          projectId: 2,
          issueKey: 'TEST2-102',
          issueType: { id: 2, name: 'バグ' },
          summary: 'テストバグ1',
          status: { id: 2, name: '未対応' },
          assignee: { id: 202, name: '佐藤花子' },
          startDate: '2024-01-02',
          dueDate: '2024-01-30',
          updated: '2024-01-16T10:00:00Z'
        }
      ];

      // API関数をモック（Result型を返すように）
      const mockFetchProjects = vi.spyOn(api, 'fetchProjects').mockResolvedValue({ 
        isOk: () => true, 
        isErr: () => false,
        value: mockProjects 
      } as any);
      const mockFetchIssues = vi.spyOn(api, 'fetchIssues').mockResolvedValue({ 
        isOk: () => true, 
        isErr: () => false,
        value: mockIssues 
      } as any);

      // テスト実行
      const result = await fetchBacklogTasks();

      // 検証：正常系の場合
      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const tasks = result.value;
        
        // 検証：API関数が呼ばれること
        expect(mockFetchProjects).toHaveBeenCalledOnce();
        expect(mockFetchIssues).toHaveBeenCalledOnce();

        // 検証：正しくTaskに変換されること  
        expect(tasks).toHaveLength(2);
        expect(tasks[0]).toEqual({
          id: 101,
          projectKey: 'TEST1',
          issueKey: 'TEST1-101',
          issueType: 'タスク',
          summary: 'テストタスク1',
          status: '処理中',
          assigneeName: '田中太郎',
          startDate: '2024-01-01',
          dueDate: '2025-12-31',
          updated: '2024/01/15 18:00',
          isOverdue: false,
          overdueDays: 0,
          isDueTomorrow: false,
          parentTask: undefined
        });
        expect(tasks[1]).toEqual({
          id: 102,
          projectKey: 'TEST2',
          issueKey: 'TEST2-102',
          issueType: 'バグ',
          summary: 'テストバグ1',
          status: '未対応',
          assigneeName: '佐藤花子',
          startDate: '2024-01-02',
          dueDate: '2024-01-30',
          updated: '2024/01/16 19:00',
          isOverdue: true,
          overdueDays: expect.any(Number),
          isDueTomorrow: false,
          parentTask: undefined
        });
      }
    });

    it('プロジェクトが見つからない場合の処理を適切に行うこと', async () => {
      // プロジェクトマッピングでキーが見つからない場合のテスト
      const mockProjects: BacklogProject[] = [
        { id: 1, projectKey: 'KNOWN', name: 'known project' }
      ];

      const mockIssues: BacklogIssue[] = [
        {
          id: 999,
          projectId: 999, // プロジェクトマップにない
          issueType: { id: 1, name: 'タスク' },
          summary: '不明プロジェクトのタスク',
          status: { id: 1, name: '処理中' },
          updated: '2024-01-15T09:00:00Z'
        }
      ];

      vi.spyOn(api, 'fetchProjects').mockResolvedValue({ 
        isOk: () => true, 
        isErr: () => false,
        value: mockProjects 
      } as any);
      vi.spyOn(api, 'fetchIssues').mockResolvedValue({ 
        isOk: () => true, 
        isErr: () => false,
        value: mockIssues 
      } as any);

      const result = await fetchBacklogTasks();

      expect(result.isOk()).toBe(true);
      if (result.isOk()) {
        const tasks = result.value;
        expect(tasks).toHaveLength(1);
        expect(tasks[0].projectKey).toBe('PROJECT_999'); // フォールバック値
      }
    });

    it('APIエラーを適切に処理できること', async () => {
      // API エラーのハンドリングテスト
      vi.spyOn(api, 'fetchProjects').mockResolvedValue({ 
        isOk: () => false,
        isErr: () => true, 
        error: new Error('プロジェクト取得エラー') 
      } as any);

      const result = await fetchBacklogTasks();
      expect(result.isErr()).toBe(true);
      
      if (result.isErr()) {
        expect(result.error.message).toBe('プロジェクト取得エラー');
      }
    });
  });
});