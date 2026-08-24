import React from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const SpeedometerGauge = ({ value, title }) => {
  const data = [
    { name: 'Achieved', value: value },
    { name: 'Remaining', value: Math.max(0, 100 - value) }
  ];

  return (
    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px] items-center justify-center relative overflow-hidden">
      <h3 className="text-base font-bold text-white mb-2 text-center w-full">{title}</h3>
      <div className="flex-1 w-full flex items-center justify-center relative">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
          <PieChart>
            <defs>
              <linearGradient id="gaugeColor" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="75%"
              startAngle={180}
              endAngle={0}
              innerRadius="75%"
              outerRadius="100%"
              dataKey="value"
              stroke="none"
            >
              <Cell key="cell-0" fill="url(#gaugeColor)" />
              <Cell key="cell-1" fill="rgba(255,255,255,0.08)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-x-0 bottom-12 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold text-white">{value}%</span>
          <span className="text-xs font-bold text-text-muted mt-1">Goal Achievement</span>
        </div>
      </div>
    </div>
  );
};

export default SpeedometerGauge;
