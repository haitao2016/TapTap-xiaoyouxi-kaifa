import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({
      error,
      errorInfo,
    });

    // 调用错误回调
    this.props.onError?.(error, errorInfo);

    // 记录错误日志
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReload = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = (): void => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = '/';
  };

  render(): ReactNode {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError) {
      if (fallback) {
        return fallback;
      }

      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconContainer}>
              <span style={styles.errorIcon}>!</span>
            </div>

            <h1 style={styles.title}>出错了</h1>

            <p style={styles.message}>{error?.message || '发生了一个未知错误'}</p>

            {process.env.NODE_ENV === 'development' && error?.stack && (
              <details style={styles.details}>
                <summary style={styles.summary}>查看错误详情</summary>
                <pre style={styles.pre}>{error.stack}</pre>
              </details>
            )}

            <div style={styles.buttonContainer}>
              <button style={styles.primaryButton} onClick={this.handleReload} type="button">
                重新加载
              </button>

              <button style={styles.secondaryButton} onClick={this.handleGoHome} type="button">
                返回首页
              </button>
            </div>
          </div>
        </div>
      );
    }

    return children;
  }
}

// 简单的函数组件错误边界
interface SimpleErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface SimpleErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class SimpleErrorBoundary extends Component<
  SimpleErrorBoundaryProps,
  SimpleErrorBoundaryState
> {
  constructor(props: SimpleErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): SimpleErrorBoundaryState {
    return { hasError: true, error };
  }

  handleRetry = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div style={styles.container}>
          <div style={styles.card}>
            <div style={styles.iconContainer}>
              <span style={styles.errorIcon}>!</span>
            </div>
            <h1 style={styles.title}>组件加载失败</h1>
            <p style={styles.message}>{this.state.error?.message || '未知错误'}</p>
            <button style={styles.primaryButton} onClick={this.handleRetry} type="button">
              重试
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// 错误边界样式
const styles = {
  container: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  card: {
    maxWidth: 500,
    padding: '40px',
    backgroundColor: '#fff',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
    textAlign: 'center' as const,
  },
  iconContainer: {
    marginBottom: '20px',
  },
  errorIcon: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 64,
    height: 64,
    borderRadius: '50%',
    backgroundColor: '#ffebee',
    color: '#d32f2f',
    fontSize: 32,
    fontWeight: 'bold' as const,
  },
  title: {
    fontSize: 24,
    fontWeight: 600,
    color: '#333',
    marginBottom: 12,
  },
  message: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
    lineHeight: 1.6,
  },
  details: {
    textAlign: 'left' as const,
    marginBottom: 24,
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  summary: {
    cursor: 'pointer',
    fontWeight: 500,
    marginBottom: 8,
  },
  pre: {
    fontSize: 12,
    overflow: 'auto' as const,
    maxHeight: 200,
    whiteSpace: 'pre-wrap' as const,
    wordBreak: 'break-word' as const,
    fontFamily: 'monospace',
  },
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    gap: 12,
    flexWrap: 'wrap' as const,
  },
  primaryButton: {
    padding: '10px 24px',
    backgroundColor: '#1976d2',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  secondaryButton: {
    padding: '10px 24px',
    backgroundColor: 'transparent',
    color: '#1976d2',
    border: '1px solid #1976d2',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default ErrorBoundary;
