import "dotenv/config";
import { ok, err } from 'neverthrow';
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
function getBacklogConfig(): BacklogConfigResult {
  const spaceUrl = process.env.BACKLOG_SPACE_URL;
  const apiKey = process.env.BACKLOG_API_KEY;
  const projectKeys = process.env.PROJECT_KEYS?.split(",") || [];
  const memberKeys = process.env.MEMBER_KEYS?.split(",") || [];

  if (!spaceUrl || !apiKey) {
    return err(new Error("環境変数 BACKLOG_SPACE_URL と BACKLOG_API_KEY が必要です"));
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
      console.warn(`Project ${id} statuses fetch failed:`, result.error.message);
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

  // 日付文字列を直接比較（YYYY-MM-DD形式想定）
  const today = new Date();
  const todayStr = today.toISOString().split("T")[0]; // YYYY-MM-DD

  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split("T")[0]; // YYYY-MM-DD

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

  // 期限超過判定
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
      return err(new Error(
        `プロジェクト情報の取得に失敗: ${projectsResult.error.message}`
      ));
    }

    const projects = projectsResult.value;
    const filteredProjects = projects.filter((p) =>
      config.projectKeys.includes(p.projectKey)
    );

    if (filteredProjects.length === 0) {
      return err(new Error(
        `指定されたプロジェクトが見つかりません: ${config.projectKeys.join(
          ", "
        )}`
      ));
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

  // ユーザーIDの取得と設定
  if (config.memberKeys.length > 0) {
    const usersResult = await fetchUsers();
    if (usersResult.isErr()) {
      // ユーザー情報の取得に失敗してもエラーとしない（警告のみ）
      console.warn(
        `ユーザー情報の取得に失敗: ${usersResult.error.message}`
      );
    } else {
      const users = usersResult.value;
      const filteredUsers = users.filter((u) =>
        config.memberKeys.includes(u.userId)
      );

      if (filteredUsers.length > 0) {
        filteredUsers.forEach((user) => {
          params.append("assigneeId[]", user.id.toString());
        });
      }
    }
  }

  const url = `${config.spaceUrl}/api/v2/issues?${params.toString()}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return err(new Error(
        `課題一覧取得に失敗: ${response.status} ${response.statusText}`
      ));
    }

    const issues = (await response.json()) as BacklogIssue[];
    return ok(issues);
  } catch (error) {
    if (error instanceof Error) {
      return err(error);
    }
    return err(new Error("課題一覧取得中に予期しないエラーが発生しました"));
  }
}

export async function fetchProjects(): Promise<ProjectsResult> {
  const configResult = getBacklogConfig();
  if (configResult.isErr()) {
    return err(configResult.error);
  }

  const config = configResult.value;
  const url = `${config.spaceUrl}/api/v2/projects?apiKey=${config.apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return err(new Error(
        `プロジェクト取得に失敗: ${response.status} ${response.statusText}`
      ));
    }

    const projects = (await response.json()) as BacklogProject[];
    return ok(projects);
  } catch (error) {
    if (error instanceof Error) {
      return err(error);
    }
    return err(new Error("プロジェクト取得中に予期しないエラーが発生しました"));
  }
}

export async function fetchProjectStatuses(
  projectId: number
): Promise<StatusesResult> {
  const configResult = getBacklogConfig();
  if (configResult.isErr()) {
    return err(configResult.error);
  }

  const config = configResult.value;
  const url = `${config.spaceUrl}/api/v2/projects/${projectId}/statuses?apiKey=${config.apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return err(new Error(
        `プロジェクト状態取得に失敗: ${response.status} ${response.statusText}`
      ));
    }

    const statuses = (await response.json()) as BacklogStatus[];
    return ok(statuses);
  } catch (error) {
    if (error instanceof Error) {
      return err(error);
    }
    return err(new Error("プロジェクト状態取得中に予期しないエラーが発生しました"));
  }
}

export async function fetchStatuses(): Promise<StatusesResult> {
  const configResult = getBacklogConfig();
  if (configResult.isErr()) {
    return err(configResult.error);
  }

  const config = configResult.value;
  const url = `${config.spaceUrl}/api/v2/statuses?apiKey=${config.apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return err(new Error(
        `状態一覧取得に失敗: ${response.status} ${response.statusText}`
      ));
    }

    const statuses = (await response.json()) as BacklogStatus[];
    return ok(statuses);
  } catch (error) {
    if (error instanceof Error) {
      return err(error);
    }
    return err(new Error("状態一覧取得中に予期しないエラーが発生しました"));
  }
}

export async function fetchUsers(): Promise<UsersResult> {
  const configResult = getBacklogConfig();
  if (configResult.isErr()) {
    return err(configResult.error);
  }

  const config = configResult.value;
  const url = `${config.spaceUrl}/api/v2/users?apiKey=${config.apiKey}`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return err(new Error(
        `ユーザー一覧取得に失敗: ${response.status} ${response.statusText}`
      ));
    }

    const users = (await response.json()) as BacklogUser[];
    return ok(users);
  } catch (error) {
    if (error instanceof Error) {
      return err(error);
    }
    return err(new Error("ユーザー一覧取得中に予期しないエラーが発生しました"));
  }
}

// API関数をまとめたオブジェクト（テスト用モック対応）
export const api = {
  fetchProjects,
  fetchIssues,
  fetchProjectStatuses,
  fetchStatuses,
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
  const tasks: Task[] = issues.map((issue) => {
    const projectKey =
      projectMap.get(issue.projectId) || `PROJECT_${issue.projectId}`;
    return transformIssueToTask(issue, projectKey);
  });

  return ok(tasks);
}
