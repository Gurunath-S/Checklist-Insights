import React from 'react';
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip as RechartsTooltip, Bar, Cell } from 'recharts';

const FunnelChart = ({ data }) => {
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899'];
  return (
    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
      <h3 className="text-base font-bold text-white mb-4 text-center">Max Campaign Funnel</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 20, right: 40, left: 30, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              dataKey="stage"
              type="category"
              stroke="var(--color-text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <RechartsTooltip
              contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={32}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default FunnelChart;
