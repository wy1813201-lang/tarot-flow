import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#FAF7F2] text-[#3D352E] flex items-center justify-center p-6 text-center">
          <div className="max-w-md space-y-6">
            <h1 className="text-4xl font-serif text-[#C9A86A]">命运的迷雾</h1>
            <p className="text-[#5C5349] font-light">
              抱歉，连接灵感时发生了一些意外。这可能是由于网络波动或系统维护。
            </p>
            <div className="p-4 bg-[#F3EEE6] rounded-xl border border-[#E8E0D2] text-xs font-mono text-left overflow-auto max-h-40 text-[#5C5349]">
              {this.state.error?.message}
            </div>
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-3 bg-[#C9A86A] text-white rounded-full font-medium hover:bg-[#B8944F] transition-colors"
            >
              重新尝试
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}
