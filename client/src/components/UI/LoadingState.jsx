import React from 'react';

const LoadingState = () => (
  <div className="loading-container">
    <div className="shimmer-logo"></div>
    <p style={{ marginTop: '1.5rem', color: 'var(--text-muted)', animation: 'pulse 2s infinite' }}>
      Synchronizing your insights...
    </p>
    <style>{`
      @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
    `}</style>
  </div>
);

export default LoadingState;
