import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

const InsightsChart = ({ data, isAdmin }) => {
  if (isAdmin) {
    return (
      <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-[2.5rem] p-10 h-[450px] shadow-2xl shadow-black/10">
        <h3 className="text-xl font-bold text-white mb-8">Submissions by Department</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={data?.departmentStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="tag_name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
              itemStyle={{ color: '#fff' }}
            />
            <Bar dataKey="submissions" radius={[10, 10, 0, 0]}>
              {data?.departmentStats?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#6366f1' : '#c084fc'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Mock data for breakdown if not provided
  const breakdownData = [
    { name: 'Dashboards Updated', value: 77, color: '#6366f1' },
    { name: 'Deploy to GIFT', value: 13, color: '#fba484' },
    { name: 'Tasks Completed', value: 8, color: '#f43f5e' },
    { name: 'Dashboards Created', value: 2, color: '#c084fc' },
  ];

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-8">
      {/* Line Chart with Area Fill */}
      <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-[2.5rem] p-10 h-[450px] shadow-2xl shadow-black/10">
        <h3 className="text-xl font-bold text-white mb-8">Task Completed (Recent Months)</h3>
        <ResponsiveContainer width="100%" height="85%">
          <AreaChart data={data?.performanceTrend || [
            { week: 'Nov 2025', points: 16 },
            { week: 'Dec 2025', points: 32 },
            { week: 'Jan 2026', points: 25 },
            { week: 'Feb 2026', points: 17 },
            { week: 'Mar 2026', points: 29 },
            { week: 'Apr 2026', points: 13 },
          ]}>
            <defs>
              <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip 
              contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
            />
            <Area 
              type="monotone" 
              dataKey="points" 
              stroke="#6366f1" 
              strokeWidth={4}
              fillOpacity={1} 
              fill="url(#colorPoints)" 
              dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
              activeDot={{ r: 6, fill: '#fff', strokeWidth: 0 }}
              label={{ position: 'top', fill: '#fff', fontSize: 14, fontWeight: 'bold', offset: 10 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Donut Chart Breakdown */}
      <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-[2.5rem] p-10 h-[450px] shadow-2xl shadow-black/10 flex flex-col">
        <h3 className="text-xl font-bold text-white mb-4">Contribution Breakdown</h3>
        <div className="flex-1 min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={breakdownData}
                cx="50%"
                cy="50%"
                innerRadius={70}
                outerRadius={100}
                paddingAngle={8}
                dataKey="value"
                stroke="none"
              >
                {breakdownData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        {/* Simple Legend */}
        <div className="grid grid-cols-2 gap-3 mt-4 text-[0.7rem]">
          {breakdownData.map(d => (
            <div key={d.name} className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: d.color }}></div>
              <span className="text-text-muted font-medium truncate">{d.name} ({d.value}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InsightsChart;
