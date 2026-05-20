import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie, Legend
} from 'recharts';

const InsightsChart = ({ data, isAdmin }) => {
  if (isAdmin) {
    const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6', '#10b981'];
    
    return (
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-6 h-auto lg:h-[600px]">

        {/* Middle Column: Two Stacked Pie Charts */}
        <div className="flex flex-col gap-6 h-full min-h-[500px]">
          {/* Pie Chart 1 */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-[2rem] p-6 shadow-xl flex-1 flex flex-col relative overflow-hidden">
            <h3 className="text-sm font-bold text-white text-center mb-2 z-10">Total users by user_position (tags)</h3>
            <div className="flex-1 w-full min-h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.usersByPositionTags || []}
                    cx="50%" cy="50%"
                    innerRadius="40%" outerRadius="75%"
                    paddingAngle={5}
                    dataKey="value" stroke="none"
                    label={({ name, percent }) => `${name.substring(0,6)}.. (${(percent * 100).toFixed(0)}%)`}
                    labelLine={true}
                    labelStyle={{ fontSize: '10px' }}
                  >
                    {data?.usersByPositionTags?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart 2 */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-[2rem] p-6 shadow-xl flex-1 flex flex-col relative overflow-hidden">
            <h3 className="text-sm font-bold text-white text-center mb-2 z-10">Total users by user_type</h3>
            <div className="flex-1 w-full min-h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.usersByType || []}
                    cx="50%" cy="50%"
                    innerRadius={0} outerRadius="75%"
                    paddingAngle={2}
                    dataKey="value" stroke="none"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={true}
                    labelStyle={{ fontSize: '10px' }}
                  >
                    {data?.usersByType?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#14b8a6', '#8b5cf6', '#f59e0b'][index % 3]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Tall Bar Chart */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-[2rem] p-6 shadow-xl flex flex-col h-full min-h-[300px]">
          <h3 className="text-sm font-bold text-white mb-6 text-center">Total users by user_position</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data?.usersByPosition || []} margin={{ top: 0, right: 30, left: 120, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="var(--text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#fff" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" width={110} />
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} barSize={25} label={{ position: 'right', fill: '#fff', fontWeight: 'bold', fontSize: 11 }}>
                   {data?.usersByPosition?.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill="#8b5cf6" />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

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
      <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-[2.5rem] p-10 h-[450px] min-h-[450px] shadow-2xl shadow-black/10 flex flex-col">
        <h3 className="text-xl font-bold text-white mb-8">Work done (Weekly Submissions)</h3>
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data?.performanceTrend || [
              { week: 'Nov 2025', points: 4 },
              { week: 'Dec 2025', points: 12 },
              { week: 'Jan 2026', points: 8 },
              { week: 'Feb 2026', points: 5 },
              { week: 'Mar 2026', points: 11 },
              { week: 'Apr 2026', points: 3 },
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
              <RechartsTooltip 
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                formatter={(value) => [value, 'Submissions']}
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
      </div>

      {/* Donut Chart Breakdown */}
      <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-[2.5rem] p-10 h-[450px] min-h-[450px] shadow-2xl shadow-black/10 flex flex-col">
        <h3 className="text-xl font-bold text-white mb-4">Contribution Breakdown</h3>
        <div className="flex-1 w-full min-h-0">
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
              <RechartsTooltip 
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
