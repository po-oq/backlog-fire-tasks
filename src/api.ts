import "dotenv/config";
import { ok, err, Result } from "neverthrow";
import { format } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import type {
  Task,
  BacklogIssue,
  BacklogProject,
  BacklogStatus,
  BacklogUser,
  OverdueStatus,
  BacklogConfig,
  BacklogConfigResult,
  TasksResult,
  ProjectsResult,
  IssuesResult,
  StatusesResult,
  UsersResult,
  ActiveStatusIdsResult,
} from "./types.js";

// 環境変数読み込み（Node.js/Bun両環境対応）


export function getBacklogConfig(): BacklogConfigResult {
  const spaceUrl = process.env.BACKLOG_SPACE_URL;
  const apiKey = process.env.BACKLOG_API_KEY;
  const projectKeys = process.env.PROJECT_KEYS?.split(",") || [];
  const memberKeys = process.env.MEMBER_KEYS?.split(",") || [];

  if (!spaceUrl || !apiKey) {
    return err(
      new Error("環境変数 BACKLOG_SPACE_URL と BACKLOG_API_KEY が必要です")
    );
  }

  return ok({
    spaceUrl,
    apiKey,
    projectKeys,
    memberKeys,
    taskLimit: parseInt(process.env.TASK_LIMIT || "100"),
    serverPort: parseInt(process.env.SERVER_PORT || "3001"),
  });
}

/**
 * Backlog API共通fetch関数
 * 設定取得、URL構築、レスポンス処理を統一化
 */
async function backlogApiFetch<T>(
  config: BacklogConfig,
  endpoint: string,
  params?: URLSearchParams
): Promise<Result<T, Error>> {
  // URL構築
  const baseUrl = `${config.spaceUrl}/api/v2/${endpoint}`;
  const url = params
    ? `${baseUrl}?${params.toString()}`
    : `${baseUrl}?apiKey=${config.apiKey}`;

  // fetch実行とレスポンス処理
  try {
    const response = await fetch(url);

    if (!response.ok) {
      return err(
        new Error(
          `Backlog API呼び出しに失敗: ${response.status} ${response.statusText} (${endpoint})`
        )
      );
    }

    const data = (await response.json()) as T;
    return ok(data);
  } catch (error) {
    if (error instanceof Error) {
      return err(error);
    }
    return err(
      new Error(
        `Backlog API呼び出し中に予期しないエラーが発生しました (${endpoint})`
      )
    );
  }
}

// ビジネスロジック関数
export function isCompletedStatus(statusName: string): boolean {
  const completedPatterns = [
    "完了",
    "完成",
    "done",
    "closed",
    "close",
    "complete",
    "finished",
  ];

  const lowerStatusName = statusName.toLowerCase();
  return completedPatterns.some((pattern) =>
    lowerStatusName.includes(pattern.toLowerCase())
  );
}

export async function getActiveStatusIds(
  projectIds: number[]
): Promise<ActiveStatusIdsResult> {
  if (projectIds.length === 0) {
    return ok([]);
  }

  // 🚀 並列処理：複数プロジェクトの状態を同時取得
  const statusPromises = projectIds.map(async (id) => {
    const result = await fetchProjectStatuses(id);
    if (result.isErr()) {
      console.warn(
        `Project ${id} statuses fetch failed:`,
        result.error.message
      );
      return ok([]); // エラー時は空配列で継続
    }
    return result;
  });

  const allProjectStatusResults = await Promise.all(statusPromises);

  // 完了以外のstatusIdを抽出・重複除去
  const activeStatusIds = new Set<number>();
  allProjectStatusResults.forEach((result) => {
    if (result.isOk()) {
      result.value.forEach((status) => {
        if (!isCompletedStatus(status.name)) {
          activeStatusIds.add(status.id);
        }
      });
    }
  });

  return ok(Array.from(activeStatusIds));
}

export function calculateOverdueStatus(dueDate?: string): OverdueStatus {
  if (!dueDate) {
    return {
      isOverdue: false,
      overdueDays: 0,
      isDueTomorrow: false,
    };
  }

  // JST（日本標準時）で今日の日付を取得 - date-fnsを使って意図を明確に
  const jstTimezone = 'Asia/Tokyo';
  const now = new Date();
  const nowJST = toZonedTime(now, jstTimezone);
  
  const todayStr = format(nowJST, 'yyyy-MM-dd'); // YYYY-MM-DD

  const tomorrow = new Date(nowJST);
  tomorrow.setDate(nowJST.getDate() + 1);
  const tomorrowStr = format(tomorrow, 'yyyy-MM-dd'); // YYYY-MM-DD

  // 期限日を正規化（時刻部分を除去）
  const dueDateStr = dueDate.split("T")[0]; // YYYY-MM-DD

  // 日付比較
  if (dueDateStr === todayStr) {
    return {
      isOverdue: false,
      overdueDays: 0,
      isDueTomorrow: false,
    };
  }

  if (dueDateStr === tomorrowStr) {
    return {
      isOverdue: false,
      overdueDays: 0,
      isDueTomorrow: true,
    };
  }

  // 期限超過判定（JST基準）
  const dueTime = new Date(dueDateStr + "T00:00:00").getTime();
  const todayTime = new Date(todayStr + "T00:00:00").getTime();
  const diffTime = todayTime - dueTime;
  const overdueDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  return {
    isOverdue: overdueDays > 0,
    overdueDays: Math.max(0, overdueDays),
    isDueTomorrow: false,
  };
}

export function transformIssueToTask(
  issue: BacklogIssue,
  projectKey: string
): Task {
  // ISO日付を日本語形式に変換（例: 2024-01-15T09:00:00Z → 2024/01/15 18:00）
  const formatDate = (isoDate: string): string => {
    const date = new Date(isoDate);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${year}/${month}/${day} ${hours}:${minutes}`;
  };

  // 期限切れ状況を計算
  const overdueStatus = calculateOverdueStatus(issue.dueDate);

  return {
    id: issue.id,
    projectKey: projectKey,
    issueKey: issue.issueKey, // 課題キーを使用
    issueType: issue.issueType.name,
    summary: issue.summary,
    status: issue.status.name,
    assigneeName: issue.assignee?.name,
    startDate: issue.startDate,
    dueDate: issue.dueDate,
    updated: formatDate(issue.updated),
    isOverdue: overdueStatus.isOverdue,
    overdueDays: overdueStatus.overdueDays,
    isDueTomorrow: overdueStatus.isDueTomorrow,
  };
}

// Backlog API対応関数
export async function fetchIssues(): Promise<IssuesResult> {
  const configResult = getBacklogConfig();
  if (configResult.isErr()) {
    return err(configResult.error);
  }

  const config = configResult.value;

  // クエリパラメータを構築
  const params = new URLSearchParams();
  params.append("apiKey", config.apiKey);
  params.append("count", config.taskLimit?.toString() || "100");

  // プロジェクトIDと完了以外の状態IDの取得・設定
  if (config.projectKeys.length > 0) {
    const projectsResult = await fetchProjects();
    if (projectsResult.isErr()) {
      return err(
        new Error(
          `プロジェクト情報の取得に失敗: ${projectsResult.error.message}`
        )
      );
    }

    const projects = projectsResult.value;
    const filteredProjects = projects.filter((p) =>
      config.projectKeys.includes(p.projectKey)
    );

    if (filteredProjects.length === 0) {
      return err(
        new Error(
          `指定されたプロジェクトが見つかりません: ${config.projectKeys.join(
            ", "
          )}`
        )
      );
    }

    const projectIds = filteredProjects.map((p) => p.id);

    // プロジェクトIDをパラメータに追加
    projectIds.forEach((id) => {
      params.append("projectId[]", id.toString());
    });

    // 🎯 NEW: 完了以外の状態IDを並列取得してパラメータに追加
    const activeStatusIdsResult = await getActiveStatusIds(projectIds);
    if (activeStatusIdsResult.isErr()) {
      return err(activeStatusIdsResult.error);
    }

    const activeStatusIds = activeStatusIdsResult.value;
    if (activeStatusIds.length > 0) {
      activeStatusIds.forEach((statusId) => {
        params.append("statusId[]", statusId.toString());
      });
    }
  }

  // ユーザーID（assigneeId）の直接指定
  if (config.memberKeys.length > 0) {
    config.memberKeys.forEach((memberId) => {
      params.append("assigneeId[]", memberId);
    });
  }

  // backlogApiFetchを使用してfetch実行
  return await backlogApiFetch<BacklogIssue[]>(config, "issues", params);
}

export async function fetchProjects(): Promise<ProjectsResult> {
  const configResult = getBacklogConfig();
  if (configResult.isErr()) {
    return err(configResult.error);
  }
  return await backlogApiFetch<BacklogProject[]>(
    configResult.value,
    "projects"
  );
}

export async function fetchProjectStatuses(
  projectId: number
): Promise<StatusesResult> {
  const configResult = getBacklogConfig();
  if (configResult.isErr()) {
    return err(configResult.error);
  }
  return await backlogApiFetch<BacklogStatus[]>(
    configResult.value,
    `projects/${projectId}/statuses`
  );
}

export async function fetchUsers(): Promise<UsersResult> {
  const configResult = getBacklogConfig();
  if (configResult.isErr()) {
    return err(configResult.error);
  }
  return await backlogApiFetch<BacklogUser[]>(configResult.value, "users");
}

// API関数をまとめたオブジェクト（テスト用モック対応）
export const api = {
  fetchProjects,
  fetchIssues,
  fetchProjectStatuses,
  fetchUsers,
};

// 統合関数
export async function fetchBacklogTasks(): Promise<TasksResult> {
  // 1. プロジェクト情報を取得（projectKeyマッピング用）
  const projectsResult = await api.fetchProjects();
  if (projectsResult.isErr()) {
    return err(projectsResult.error);
  }

  const projects = projectsResult.value;
  const projectMap = new Map<number, string>();
  projects.forEach((project) => {
    projectMap.set(project.id, project.projectKey);
  });

  // 2. 課題一覧を取得
  const issuesResult = await api.fetchIssues();
  if (issuesResult.isErr()) {
    return err(issuesResult.error);
  }

  const issues = issuesResult.value;

  // 3. 各課題をTask型に変換
  const realTasks: Task[] = issues.map((issue) => {
    const projectKey =
      projectMap.get(issue.projectId) || `PROJECT_${issue.projectId}`;
    return transformIssueToTask(issue, projectKey);
  });

  return ok(realTasks);
}
