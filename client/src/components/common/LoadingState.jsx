import React from 'react';

const LoadingState = () => (
  <div className="flex flex-col items-center justify-center h-[60vh]">
    <div className="w-16 h-16 bg-bg-card border border-glass-border rounded-2xl relative overflow-hidden">
      <div className="absolute inset-0 -left-full w-[200%] h-full bg-linear-to-r from-transparent via-white/10 to-transparent animate-[shimmer_1.5s_infinite]"></div>
    </div>
    <p className="mt-6 text-text-muted font-medium animate-pulse tracking-wide">
      Synchronizing your insights...
    </p>
  </div>
);

export default LoadingState;
