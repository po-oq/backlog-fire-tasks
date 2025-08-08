# backlog-fire-tasks 🔥

> Backlogタスクの期限切れを視覚的に管理するCLIダッシュボード

[![npm version](https://badge.fury.io/js/backlog-fire-tasks.svg)](https://badge.fury.io/js/backlog-fire-tasks)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## ✨ 特徴

- **🔥 期限切れ警告**: 期限切れタスクをアニメーション付きアイコンで強調表示
- **📊 一覧表示**: プロジェクト横断でチームメンバーのタスクを統合管理
- **👤✍️ 二重視点**: 「担当タスク」と「作成タスク」をタブ切り替えで表示
- **📱 レスポンシブUI**: モバイル〜PCまで最適表示のブラウザダッシュボード
- **⚡ ワンコマンド起動**: `npx backlog-fire-tasks` で即座にサーバー起動
- **🎨 視覚的分類**: 色とアイコンでタスク状況を即座に把握

## 🚀 インストール & 実行

### 🎯 推奨方法（第三者向け）

```bash
# リポジトリをクローン後
git clone <repo-url>
cd backlog-fire-tasks
npm install
npm start  # 自動ビルド＋起動
```

### 🔧 開発者向け

```bash
# 開発時（高速起動）
npm run dev

# ビルドなしで起動（lintスキップ）
npm run quick

# フルビルド後起動
npm run build && node bin/cli.js
```

### 📦 公開後（予定）

```bash
# グローバルインストール
npm install -g backlog-fire-tasks
backlog-fire-tasks

# npxで直接実行
npx backlog-fire-tasks
```

実行すると：
1. BacklogAPIからタスク取得
2. Expressサーバー起動（localhost:3001）
3. ブラウザ自動起動
4. 「👤 担当タスク」「✍️ 作成タスク」をタブで切り替え表示
5. リアルタイムでタスク確認！

## 🔧 環境設定

`.env`ファイルを作成し、以下を設定：

```env
BACKLOG_SPACE_URL=https://your-space.backlog.jp
BACKLOG_API_KEY=your-api-key
PROJECT_KEYS=PROJECT1,PROJECT2,PROJECT3
MEMBER_KEYS=user1,user2,user3
```

### 設定値の取得方法

1. **BACKLOG_SPACE_URL**: BacklogのスペースURL
2. **BACKLOG_API_KEY**: Backlog設定 > API設定から生成
3. **PROJECT_KEYS**: プロジェクト設定で確認可能なキー
4. **MEMBER_KEYS**: ユーザー管理で確認可能なユーザーキー

## 📊 表示内容

| 項目 | 説明 | 表示形式 |
|------|------|----------|
| 🔥 期限切れ | 期限超過タスク | 赤ボーダー + アニメーション |
| ⚠️ 明日期限 | 明日が期限のタスク | 黄ボーダー + 薄黄背景 |
| ✅ 期限内 | 期限内のタスク | 青/緑ボーダー |
| 📝 期限未設定 | 期限が設定されていないタスク | グレーボーダー |

## 🔌 使用API

### 主要なBacklog API呼び出し例

```javascript
// 担当タスク取得
const assignedIssues = await fetch(
  `${BACKLOG_SPACE_URL}/api/v2/issues?` +
  `apiKey=${BACKLOG_API_KEY}&` +
  `projectId[]=${projectIds.join('&projectId[]=')}&` +
  `assigneeId[]=${assigneeIds.join('&assigneeId[]=')}&` +
  `statusId[]=${nonCompletedStatusIds.join('&statusId[]=')}&` +
  `count=100`
);

// 作成タスク取得
const createdIssues = await fetch(
  `${BACKLOG_SPACE_URL}/api/v2/issues?` +
  `apiKey=${BACKLOG_API_KEY}&` +
  `projectId[]=${projectIds.join('&projectId[]=')}&` +
  `createdUserId[]=${userIds.join('&createdUserId[]=')}&` +
  `statusId[]=${nonCompletedStatusIds.join('&statusId[]=')}&` +
  `count=100`
);

// プロジェクト一覧取得
const projects = await fetch(
  `${BACKLOG_SPACE_URL}/api/v2/projects?apiKey=${BACKLOG_API_KEY}`
);

// プロジェクトの状態一覧取得
const statuses = await fetch(
  `${BACKLOG_SPACE_URL}/api/v2/projects/${projectId}/statuses?apiKey=${BACKLOG_API_KEY}`
);
```

## 💻 開発

```bash
# リポジトリクローン
git clone <repo-url>
cd backlog-fire-tasks

# 依存関係インストール
npm install

# 開発モード（TypeScript直接実行）
npm run dev

# ビルド
npm run build

# ローカルテスト
npm link
backlog-fire-tasks
```

## 📁 プロジェクト構成

```
backlog-fire-tasks/
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

## 🎯 主要機能

### タスク表示モード
- **👤 担当タスク**: 自分が担当者として割り当てられたタスク
- **✍️ 作成タスク**: 自分が作成者（登録者）として登録したタスク
- **🔄 動的切り替え**: タブクリックでリアルタイムAPI再取得

### 期限管理
- **期限切れ判定**: `dueDate < new Date()`
- **明日期限判定**: `dueDate === tomorrow`
- **遅延日数計算**: `Math.floor((new Date() - new Date(dueDate)) / (1000 * 60 * 60 * 24))`

### 視覚化
- CSS Grid + Tailwindによるレスポンシブ対応
- 1画面に16+件表示可能なコンパクト設計
- 状況別の色分けとアイコン表示
- フィルターラベルの動的変更（👤 担当者 ⇔ ✍️ 作成者）

### データ取得
- 完了以外の状態のみ取得（事前に状態一覧APIで状態ID取得）
- 担当者・作成者情報の安全な取得（`issue.assignee?.name`, `issue.createdUser?.name`）
- エラーハンドリング（API接続エラー、環境変数未設定等）

## 🌟 拡張案

- [ ] リアルタイム更新（WebSocket）
- [x] フィルタリング機能（プロジェクト・担当者・状態別）
- [x] タブ切り替え機能（担当タスク・作成タスク）
- [ ] ソート機能（期限・更新日・遅延日数順）
- [ ] CSV/PDF出力
- [ ] Slack/Teams通知連携
- [ ] テーマ切り替え（ダーク/ライト）
- [ ] タスクの優先度表示
- [ ] 進捗バー表示（工数ベース）

## 📄 ライセンス

MIT

## 🤝 コントリビューション

Issue、Pull Requestお待ちしています！

---

**🔥 期限切れタスクを見逃すな！** - backlog-fire-tasks