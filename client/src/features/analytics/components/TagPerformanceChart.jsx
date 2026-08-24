import React, { useMemo } from 'react';
import { ResponsiveContainer, BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Cell } from 'recharts';
import ErrorBoundary from '../../../components/common/ErrorBoundary';

const TagPerformanceChart = ({ filteredTags, selectedTag }) => {
  const slicedTags = useMemo(() => {
    return (filteredTags || []).slice(0, 10);
  }, [filteredTags]);

  return (
    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-5 shadow-xl space-y-4">
      <div>
        <h4 className="text-xs font-black uppercase tracking-widest text-white">Tag Performance Chart</h4>
        <p className="text-[9px] text-text-muted mt-0.5">Average compliance rates compared (Top 10 matched tags)</p>
      </div>

      <div className="h-[200px] w-full text-xs">
        <ErrorBoundary>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
            <RechartsBarChart data={slicedTags} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="tag_name" tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 9 }} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 9 }} />
            <RechartsTooltip
              contentStyle={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
              labelClassName="text-white font-bold"
              itemStyle={{ color: 'var(--color-accent)' }}
            />
            <Bar dataKey="avg_completion_rate" name="Compliance Rate" radius={[6, 6, 0, 0]}>
              {slicedTags.map((t, idx) => (
                <Cell
                  key={idx}
                  fill={t.tag_id === selectedTag?.tag_id ? 'url(#active-bar-grad)' : 'url(#inactive-bar-grad)'}
                />
              ))}
            </Bar>
            {/* Gradients */}
            <defs>
              <linearGradient id="active-bar-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-accent, #10b981)" />
                <stop offset="100%" stopColor="var(--color-accent-hover, #059669)" />
              </linearGradient>
              <linearGradient id="inactive-bar-grad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--color-primary, #6366f1)" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.1" />
              </linearGradient>
            </defs>
          </RechartsBarChart>
        </ResponsiveContainer>
      </ErrorBoundary>
      </div>
    </div>
  );
};

export default TagPerformanceChart;
