import React from 'react';
import { createRoot } from 'react-dom/client';
import { ClientDashboard } from './components/ClientDashboard.js';

// HTMLから渡されるbacklogSpaceUrl設定を取得
declare global {
  interface Window {
    BACKLOG_SPACE_URL?: string;
  }
}

const backlogSpaceUrl = window.BACKLOG_SPACE_URL || '';

// Reactアプリケーションをマウント
const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(
    <ClientDashboard backlogSpaceUrl={backlogSpaceUrl} />
  );
} else {
  console.error('Root element not found');
}