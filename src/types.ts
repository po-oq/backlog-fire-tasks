// neverthrow型定義
import type { Result } from 'neverthrow';

// Backlog API レスポンス型定義

export interface BacklogIssue {
  id: number;
  projectId: number;
  issueKey: string; // 課題キー (例: "PROJECT-123")
  issueType: { 
    id: number;
    name: string; 
  };
  summary: string;
  status: { 
    id: number;
    name: string; 
  };
  assignee?: {
    id: number;
    name: string;
  };
  startDate?: string;
  dueDate?: string;
  updated: string;
}

export interface BacklogProject {
  id: number;
  projectKey: string;
  name: string;
}

export interface BacklogStatus {
  id: number;
  name: string;
}

export interface BacklogUser {
  id: number;
  userId: string;
  name: string;
}

// アプリケーション用型定義

export interface Task {
  id: number;
  projectKey: string;
  issueKey: string; // 課題キー (例: "PROJECT-123")
  issueType: string;
  summary: string;
  status: string;
  assigneeName?: string;
  startDate?: string;
  dueDate?: string;
  updated: string;
  isOverdue: boolean;
  overdueDays: number;
  isDueTomorrow: boolean;
}

// API関数の戻り値型

export interface OverdueStatus {
  isOverdue: boolean;
  overdueDays: number;
  isDueTomorrow: boolean;
}

// 環境変数設定型

export interface BacklogConfig {
  spaceUrl: string;
  apiKey: string;
  projectKeys: string[];
  memberKeys: string[];
  taskLimit?: number;
  serverPort?: number;
}

// neverthrow API 戻り値型定義

export type BacklogConfigResult = Result<BacklogConfig, Error>;
export type TasksResult = Result<Task[], Error>;
export type ProjectsResult = Result<BacklogProject[], Error>;
export type IssuesResult = Result<BacklogIssue[], Error>;
export type StatusesResult = Result<BacklogStatus[], Error>;
export type UsersResult = Result<BacklogUser[], Error>;
export type ActiveStatusIdsResult = Result<number[], Error>;