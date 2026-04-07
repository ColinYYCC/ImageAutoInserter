import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { createRendererLogger, getLogCollector, type LogEntry } from './utils/renderer-logger';
import './components/shared/styles/base.css';

const logger = createRendererLogger('Renderer');

logger.info('渲染进程启动');

const rootElement = document.getElementById('root');

if (rootElement) {
  logger.info('Root 元素存在，准备创建 React Root');
  logger.debug('Root 元素信息:', {
    tagName: rootElement.tagName,
    id: rootElement.id,
    className: rootElement.className,
    childCount: rootElement.children.length,
  });

  try {
    logger.info('创建 React Root...');
    const root = ReactDOM.createRoot(rootElement);
    logger.info('React Root 创建成功');

    logger.info('开始渲染 App 组件...');
    root.render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>
    );
    logger.info('render() 调用完成，等待组件挂载...');
  } catch (error) {
    const err = error as Error;
    logger.error('渲染失败:', {
      name: err.name,
      message: err.message,
      stack: err.stack,
    });
    document.body.innerHTML = `
      <div style="padding: 20px; font-family: system-ui, sans-serif;">
        <h1 style="color: #e74c3c;">渲染失败</h1>
        <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${err.message}\n\n${err.stack || ''}</pre>
      </div>
    `;
  }
} else {
  logger.error('致命错误: 无法找到 root 元素 (#root)');
  logger.debug('document.body 内容:', document.body.innerHTML.substring(0, 500));
  document.body.innerHTML = `
    <div style="padding: 20px; font-family: system-ui, sans-serif;">
      <h1 style="color: #e74c3c;">应用启动失败</h1>
      <p>错误：无法找到应用容器 (#root)</p>
      <p>document.body.innerHTML 前 500 字符：</p>
      <pre style="background: #f5f5f5; padding: 10px; overflow: auto;">${document.body.innerHTML.substring(0, 500)}</pre>
    </div>
  `;
}

window.addEventListener('error', (event) => {
  logger.error('全局错误捕获:', {
    message: event.message,
    filename: event.filename,
    lineno: event.lineno,
    colno: event.colno,
    error: event.error?.stack,
  });
});

window.addEventListener('unhandledrejection', (event) => {
  logger.error('未处理的 Promise 拒绝:', {
    reason: event.reason?.message || event.reason,
    stack: event.reason?.stack,
  });
});

logger.info('全局错误处理器已注册');

declare global {
  interface Window {
    __RENDERER_LOGGER__: {
      getLogs: () => LogEntry[];
      getStats: () => { total: number; byLevel: Record<number, number>; byModule: Record<string, number> };
      clearLogs: () => void;
      setLevel: (level: number) => void;
    };
  }
}

window.__RENDERER_LOGGER__ = {
  getLogs: () => getLogCollector().getEntries(),
  getStats: () => getLogCollector().getStats(),
  clearLogs: () => getLogCollector().clear(),
  setLevel: (level: number) => getLogCollector().setConfig({ minLevel: level }),
};

logger.info('日志诊断工具已注册到 window.__RENDERER_LOGGER__');
