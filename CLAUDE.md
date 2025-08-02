# Backlog Task Manager 🔥

## Project Goal 🎯

**パッケージ名**: `backlog-fire-tasks`

BacklogのタスクをCLIで管理し、期限切れタスクを🔥アイコンで視覚的に警告するダッシュボードツール。
チームメンバーの作業効率向上と期限管理の徹底を目的とする。

### 主な目標
- 期限切れタスクの見逃し防止（🔥アニメーション）
- プロジェクト横断的なタスク状況の一覧化
- ブラウザベースの直感的なUI提供
- ワンコマンドでの起動・確認

## 概要 🎯

プロジェクトごとのチームメンバーのタスク期限を管理する CLI ツール！  
期限切れたらアツいアイコンで教えてくれる〜🔥

## 機能 ⚡

- プロジェクト・メンバー別のタスク一覧表示
- 期限切れタスクの視覚化（🔥 アイコン + 遅延日数）
- React + Tailwind のペライチ HTML 生成
- ブラウザで自動表示

## 使い方 🚀

### インストール & 実行

```bash
npm install -g backlog-task-manager
npx backlog
```

実行すると：

1. BacklogAPI からタスク取得
2. Express サーバー起動（localhost:3001）
3. ブラウザ自動起動
4. リアルタイムでタスク確認！

## 環境設定 🔧

`.env` ファイルに以下を設定：

```env
BACKLOG_SPACE_URL=https://your-space.backlog.jp
BACKLOG_API_KEY=your-api-key
PROJECT_KEYS=PROJECT1,PROJECT2,PROJECT3
MEMBER_KEYS=user1,user2,user3
```

## 技術仕様 💻

### プロジェクト構成

```
backlog-task-manager/
├── package.json
├── tsconfig.json
├── .env.example
├── src/
│   ├── cli.ts          # メインCLI（TypeScript）
│   ├── api.ts          # Backlog API処理
│   └── types.ts        # 型定義
├── bin/
│   └── cli.js          # コンパイル後のJS（実行ファイル）
└── README.md
```

### package.json 設定

```json
{
  "name": "backlog-task-manager",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "backlog": "./bin/cli.js"
  },
  "scripts": {
    "build": "tsc && chmod +x ./bin/cli.js",
    "dev": "tsx src/cli.ts",
    "prepare": "npm run build"
  },
  "files": ["bin", "src"],
  "dependencies": {
    "express": "^4.18.0",
    "react": "^18.0.0",
    "react-dom": "^18.0.0",
    "open": "^8.4.0",
    "dotenv": "^16.0.0"
  },
  "devDependencies": {
    "typescript": "^5.0.0",
    "tsx": "^4.0.0",
    "@types/node": "^20.0.0",
    "@types/express": "^4.17.0",
    "@types/react": "^18.0.0",
    "@types/react-dom": "^18.0.0"
  }
}
```

### CLI エントリーポイント（src/cli.ts）

```typescript
#!/usr/bin/env node

import express from "express";
import React from "react";
import { renderToString } from "react-dom/server";
import open from "open";
import { fetchBacklogTasks } from "./api.js";
import type { Task } from "./types.js";

const app = express();
const PORT = 3001;

// React Dashboard Component（最新のコンパクトカード形式）
const Dashboard = ({ tasks }: { tasks: Task[] }) => (
  <html>
    <head>
      <title>Backlog Tasks 🔥</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <meta charSet="UTF-8" />
      <style>{`
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
      `}</style>
    </head>
    <body className="bg-gray-50 p-4">
      <div className="max-w-full mx-auto">
        <h1 className="text-3xl font-bold mb-6 text-center bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
          タスク管理ダッシュボード 📋
        </h1>

        <div className="mb-4 flex justify-between items-center">
          <div className="space-x-2">
            <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm font-medium">
              ✅ 取得: {tasks.length}件
            </span>
            <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm font-medium">
              🔥 期限切れ: {tasks.filter((t) => t.isOverdue).length}件
            </span>
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-sm font-medium">
              ⚠️ 明日期限: {tasks.filter((t) => t.isDueTomorrow).length}件
            </span>
          </div>
          <div className="text-sm text-gray-500">
            最終更新: {new Date().toLocaleString("ja-JP")}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {tasks.map((task) => (
            <div
              key={task.id}
              className={`bg-white rounded-lg shadow-md p-3 border-l-4 hover:shadow-lg transition-shadow ${
                task.isOverdue
                  ? "border-red-500"
                  : task.isDueTomorrow
                  ? "border-yellow-500 bg-yellow-50"
                  : task.status === "完了"
                  ? "border-green-500 opacity-75"
                  : task.dueDate
                  ? "border-blue-500"
                  : "border-gray-400"
              }`}
            >
              <div className="flex justify-between items-start mb-2">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">
                    {task.isOverdue
                      ? "🔥"
                      : task.isDueTomorrow
                      ? "⚠️"
                      : task.status === "完了"
                      ? "✅"
                      : task.dueDate
                      ? "✅"
                      : "📝"}
                  </span>
                  <span
                    className={`text-xs px-2 py-1 rounded font-medium ${
                      task.isOverdue
                        ? "bg-red-100 text-red-800"
                        : task.isDueTomorrow
                        ? "bg-yellow-100 text-yellow-800"
                        : task.status === "完了"
                        ? "bg-green-100 text-green-800"
                        : task.dueDate
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {task.isOverdue
                      ? `${task.overdueDays}日遅延`
                      : task.isDueTomorrow
                      ? "明日期限"
                      : task.status === "完了"
                      ? "完了"
                      : task.dueDate
                      ? "期限内"
                      : "期限未設定"}
                  </span>
                  <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                    {task.projectKey}
                  </span>
                  <span className="bg-purple-100 text-purple-800 text-xs px-2 py-1 rounded">
                    {task.issueType}
                  </span>
                </div>
                <span
                  className={`text-xs font-medium ${
                    task.status === "完了"
                      ? "text-green-600"
                      : task.status === "処理中"
                      ? "text-yellow-600"
                      : "text-blue-600"
                  }`}
                >
                  {task.status}
                </span>
              </div>
              <h3
                className={`text-sm font-semibold text-gray-800 mb-2 truncate ${
                  task.status === "完了" ? "line-through" : ""
                }`}
              >
                {task.summary}
              </h3>
              <div className="flex justify-between items-center text-xs text-gray-600">
                <div className="flex items-center space-x-3">
                  <span>👤 {task.assigneeName || "未割当"}</span>
                  <span>
                    期限:{" "}
                    <span
                      className={`font-medium ${
                        task.isOverdue
                          ? "text-red-600"
                          : task.isDueTomorrow
                          ? "text-yellow-600"
                          : task.dueDate
                          ? "text-green-600"
                          : "text-gray-500"
                      }`}
                    >
                      {task.dueDate || "未設定"}
                    </span>
                  </span>
                  <span>開始: {task.startDate || "未設定"}</span>
                </div>
                <span>更新: {task.updated}</span>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-6 text-center text-gray-500 text-sm">
          <p>
            📊 合計タスク数: {tasks.length}件 | サーバー停止:{" "}
            <kbd className="px-2 py-1 bg-gray-200 rounded text-xs">Ctrl+C</kbd>
          </p>
        </div>
      </div>
    </body>
  </html>
);

async function startServer() {
  console.log("🔍 Backlogからデータ取得中...");

  try {
    const tasksResult = await fetchBacklogTasks();
    
    if (tasksResult.isErr()) {
      throw new Error(`タスク取得に失敗しました: ${tasksResult.error.message}`);
    }
    
    const tasks = tasksResult.value;
    console.log(`✅ ${tasks.length}件のタスクを取得！`);

    app.get("/", (req, res) => {
      const html = renderToString(<Dashboard tasks={tasks} />);
      res.send(`<!DOCTYPE html>${html}`);
    });

    app.listen(PORT, () => {
      console.log(`🚀 サーバー起動完了！`);
      console.log(`📱 http://localhost:${PORT}`);
      open(`http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("❌ エラーが発生:", error.message);
    process.exit(1);
  }
}

startServer();
```

## 表示項目 📊

| 項目             | 説明                   | 実装                   | 表示形式                                    |
| ---------------- | ---------------------- | ---------------------- | ------------------------------------------- |
| 状態アイコン     | 期限状況を視覚化       | 計算で算出             | 🔥 期限切れ/⚠️ 明日期限/✅ 期限内/📝 未設定 |
| 遅延/期限情報    | 遅延日数または期限状況 | 計算で算出             | "5 日遅延"/"明日期限"/"期限内"/"期限未設定" |
| プロジェクトキー | プロジェクト識別子     | `issue.projectKey`     | カラーラベル表示                            |
| 種別             | 課題のカテゴリ         | `issue.issueType.name` | カラーラベル表示                            |
| タイトル         | 課題のタイトル         | `issue.summary`        | 省略表示対応                                |
| 担当者           | 課題担当者             | `issue.assignee.name`  | 👤 担当者名                                 |
| 状態             | 処理状況               | `issue.status.name`    | 右端に色分け表示                            |
| 期限日           | 課題期限               | `issue.dueDate`        | 色分け表示（遅延=赤/明日=黄/期限内=緑）     |
| 開始日           | 課題開始日             | `issue.startDate`      | グレー表示                                  |
| 更新日           | 最終更新日時           | `issue.updated`        | 右端にグレー表示                            |

## 使用 API 🔌

### 課題一覧の取得

```
GET /api/v2/issues
```

**パラメータ：**

- `projectId[]`: プロジェクト ID 配列
- `assigneeId[]`: 担当者 ID 配列
- `statusId[]`: 状態 ID 配列（完了以外）
- `count`: 取得件数

### プロジェクト一覧の取得

```
GET /api/v2/projects
```

### プロジェクトの状態一覧取得

```
GET /api/v2/projects/{projectId}/statuses
```

## 型定義 📝

```typescript
// src/types.ts
export interface Task {
  id: number;
  projectKey: string;
  issueType: string;
  summary: string;
  status: string;
  assigneeName?: string; // 担当者名（追加）
  startDate?: string;
  dueDate?: string;
  updated: string;
  isOverdue: boolean;
  overdueDays: number;
  isDueTomorrow: boolean; // 明日期限フラグ（追加）
}

export interface BacklogIssue {
  id: number;
  projectId: number;
  issueType: { name: string };
  summary: string;
  status: { name: string };
  assignee?: {
    // 担当者情報（追加）
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
```

## 開発フロー 🔄

```bash
# 開発開始
git clone <repo>
cd backlog-task-manager
npm install

# 開発時（TSを直接実行）
npm run dev

# ビルド
npm run build

# ローカルテスト
npm link
backlog

# 公開
npm publish
```

## 実装メモ 📝

1. **完了以外の状態取得**: 事前に状態一覧 API で状態 ID を取得
2. **期限切れ判定**: `dueDate < new Date()` で実装
3. **明日期限判定**: `dueDate === tomorrow` で実装
4. **遅延日数計算**: `Math.floor((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24))`
5. **レスポンス型定義**: 必要な項目のみ定義（全フィールド保持しない）
6. **担当者取得**: `issue.assignee?.name` で null 安全に取得
7. **レスポンシブ対応**: CSS Grid + Tailwind でモバイル〜PC 対応
8. **視覚的分類**:
   - 🔥 期限切れ → 赤ボーダー + 白背景 + fire-animation
   - ⚠️ 明日期限 → 黄ボーダー + 薄黄背景
   - ✅ 期限内/完了 → 青/緑ボーダー + 白背景
   - 📝 期限未設定 → グレーボーダー + 白背景
9. **情報密度**: 1 画面に 16+件表示可能なコンパクト設計
10. **エラーハンドリング**: API 接続エラー、環境変数未設定等の対応
11. **サーバー終了**: `Ctrl+C` で停止

## 拡張案 🌟

- [ ] リアルタイム更新（WebSocket）
- [ ] フィルタリング機能（プロジェクト・担当者・状態別）
- [ ] ソート機能（期限・更新日・遅延日数順）
- [ ] CSV/PDF 出力
- [ ] Slack/Teams 通知連携
- [ ] テーマ切り替え（ダーク/ライト）
- [ ] タスクの優先度表示
- [ ] 進捗バー表示（工数ベース）
- [ ] 担当者のアバター画像対応
- [ ] デスクトップ通知機能

---

これで**最新のコンパクトカード形式**の Backlog タスク管理ツールの完成〜！🎉

### 特徴まとめ ✨

- **👤 担当者表示**: シンプルで分かりやすい
- **🔥 期限切れ強調**: アニメーション付きで見逃し防止
- **📱 レスポンシブ**: モバイル〜PC まで最適表示
- **⚡ 高密度表示**: 1 画面に 16+件表示可能
- **🎨 視覚的分類**: 色とアイコンで状況を即座に把握
