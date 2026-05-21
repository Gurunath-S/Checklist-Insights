import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { Activity } from 'lucide-react';

const InsightsChart = ({ data, isAdmin, selectedMetrics = [] }) => {
  if (isAdmin) {
    const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6', '#10b981'];
    
    return (
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-4 h-auto lg:h-[500px]">

        {/* Middle Column: Two Stacked Pie Charts */}
        <div className="flex flex-col gap-4 h-full min-h-[400px]">
          {/* Pie Chart 1 */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex-1 flex flex-col relative overflow-hidden">
            <h3 className="text-sm font-bold text-white text-center mb-2 z-10">Total users by user_position (tags)</h3>
            <div className="flex-1 w-full min-h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.usersByPositionTags || []}
                    cx="50%" cy="50%"
                    innerRadius="40%" outerRadius="75%"
                    paddingAngle={0}
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
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex-1 flex flex-col relative overflow-hidden">
            <h3 className="text-sm font-bold text-white text-center mb-2 z-10">Total users by user_type</h3>
            <div className="flex-1 w-full min-h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.usersByType || []}
                    cx="50%" cy="50%"
                    innerRadius={0} outerRadius="75%"
                    paddingAngle={0}
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
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-full min-h-[250px]">
          <h3 className="text-sm font-bold text-white mb-6 text-center">Total users by user_position</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data?.usersByPosition || []} margin={{ top: 0, right: 30, left: 120, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
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

  // Generate dynamic Contribution Breakdown data from user's selected metrics
  const selectedMetricsData = data?.itemStats?.filter(item => selectedMetrics.includes(item.name)) || [];
  const totalValue = selectedMetricsData.reduce((acc, curr) => acc + curr.value, 0);

  const colors = [
    '#10b981', // Emerald
    '#8b5cf6', // Purple
    '#f59e0b', // Amber
    '#f43f5e', // Rose
    '#06b6d4', // Cyan
    '#d946ef', // Fuchsia
    '#0ea5e9', // Sky Blue
    '#14b8a6', // Teal
    '#6366f1', // Indigo
    '#f97316', // Orange
    '#84cc16', // Lime
    '#ec4899'  // Pink
  ];

  const breakdownData = selectedMetricsData.map((item, index) => {
    const percentage = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;
    return {
      name: item.name,
      value: item.value,
      percentage: percentage,
      color: colors[index % colors.length]
    };
  });

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
      {/* Line Chart with Area Fill */}
      <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-6 h-[380px] min-h-[380px] shadow-2xl shadow-black/10 flex flex-col">
        <h3 className="text-lg font-bold text-white mb-4">Work done (Weekly Submissions)</h3>
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
              <XAxis dataKey="week" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
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
                label={{ position: 'top', fill: '#fff', fontSize: 12, fontWeight: 'bold', offset: 10 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut Chart Breakdown */}
      <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-6 h-[380px] min-h-[380px] shadow-2xl shadow-black/10 flex flex-col">
        <h3 className="text-lg font-bold text-white mb-2">Contribution Breakdown</h3>
        <div className="flex-1 w-full min-h-0 flex flex-col justify-center">
          {breakdownData.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-8 space-y-2">
              <Activity size={32} className="mx-auto opacity-30 animate-pulse text-primary" />
              <p>No checklist items recorded.</p>
              <p className="text-xs opacity-60">Log some activities to see your performance metrics breakdown.</p>
            </div>
          ) : (
            <div className="flex flex-row items-center justify-between gap-4 h-full min-h-0">
              {/* Left Column: Donut Chart (48% width) */}
              <div className="w-[48%] h-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={breakdownData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={80}
                      paddingAngle={0}
                      dataKey="value"
                      stroke="none"
                    >
                      {breakdownData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                      formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, name]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Right Column: Scrollable Legend (52% width) */}
              <div className="w-[52%] max-h-full overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                {breakdownData.map(d => (
                  <div key={d.name} className="flex items-start gap-2.5 min-w-0" title={d.name}>
                    <div className="w-2.5 h-2.5 rounded-xs shrink-0 mt-0.5" style={{ background: d.color }}></div>
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="text-white text-[11px] font-bold truncate">{d.name}</span>
                      <span className="text-text-muted text-[10px]">{d.value} items ({d.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightsChart;
