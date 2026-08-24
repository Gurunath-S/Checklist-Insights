import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-6 bg-white/5 border border-red-500/20 rounded-3xl text-center space-y-2 flex flex-col items-center justify-center h-full min-h-[150px]">
          <p className="text-xs font-bold text-red-400">Chart rendering error</p>
          <p className="text-[10px] text-text-muted">Something went wrong while trying to display this chart.</p>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
