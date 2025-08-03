import '@testing-library/jest-dom';

// グローバルなテストモックとセットアップ
global.fetch = vi.fn();

// React 18の警告を抑制（テスト環境）
const originalConsoleError = console.error;
console.error = (...args: any[]) => {
  if (typeof args[0] === 'string' && args[0].includes('Warning: ReactDOM.render is deprecated')) {
    return;
  }
  originalConsoleError(...args);
};