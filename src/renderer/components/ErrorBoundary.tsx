import { Component, ErrorInfo, ReactNode } from 'react';
import { createRendererLogger } from '../utils/renderer-logger';

const logger = createRendererLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    logger.error('getDerivedStateFromError 被调用 - 捕获到错误:', {
      name: error.name,
      message: error.message,
    });
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    logger.error('='.repeat(50));
    logger.error('React 组件崩溃:', {
      message: error.message,
      name: error.name,
    });
    logger.debug('组件堆栈:', errorInfo.componentStack);
    logger.error('='.repeat(50));

    this.setState({ errorInfo, error });
  }

  public render() {
    logger.debug('ErrorBoundary render, hasError:', this.state.hasError);

    if (this.state.hasError) {
      logger.error('渲染错误状态 UI');
      return (
        <div style={{
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          maxWidth: '800px',
          margin: '0 auto',
        }}>
          <h1 style={{ color: '#e74c3c' }}>⚠️ 应用加载失败</h1>
          <p>渲染过程中发生错误，请检查以下信息：</p>
          <details style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5' }}>
            <summary>错误详情（开发环境）</summary>
            <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
{`错误类型: ${this.state.error?.name || 'Unknown'}
错误消息: ${this.state.error?.message || 'No message'}
${this.state.error?.stack ? '\n堆栈跟踪:\n' + this.state.error.stack : ''}
${this.state.errorInfo?.componentStack ? '\n组件堆栈:\n' + this.state.errorInfo.componentStack : ''}`}
            </pre>
          </details>
          <div style={{ marginTop: '20px' }}>
            <h3>建议的解决步骤：</h3>
            <ol>
              <li>按 Cmd+Option+I 打开开发者工具查看详细错误</li>
              <li>查看 Console 标签页中的错误信息</li>
              <li>如果问题持续，请联系技术支持</li>
            </ol>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
