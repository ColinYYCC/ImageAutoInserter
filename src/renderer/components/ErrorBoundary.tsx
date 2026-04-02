import React, { Component, ErrorInfo, ReactNode } from 'react';

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
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('渲染错误:', error);
    console.error('错误信息:', errorInfo);
    this.setState({ errorInfo });
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '20px',
          fontFamily: 'system-ui, -apple-system, sans-serif',
          maxWidth: '800px',
          margin: '0 auto',
        }}>
          <h1 style={{ color: '#e74c3c' }}>应用加载失败</h1>
          <p>请尝试以下步骤：</p>
          <ol>
            <li>重新安装应用</li>
            <li>清除应用数据后重试</li>
            <li>联系技术支持</li>
          </ol>
          {process.env.NODE_ENV === 'development' && (
            <details style={{ marginTop: '20px', padding: '10px', background: '#f5f5f5' }}>
              <summary>错误详情（仅开发环境显示）</summary>
              <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {this.state.error?.toString()}
                {'\n'}
                {this.state.errorInfo?.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
