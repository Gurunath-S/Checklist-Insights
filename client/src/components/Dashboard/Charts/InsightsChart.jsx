import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';

const InsightsChart = ({ data, isAdmin }) => {
  if (isAdmin) {
    return (
      <div className="card" style={{ height: '400px', marginTop: '2rem' }}>
        <h3 style={{ marginBottom: '2rem' }}>Submissions by Department</h3>
        <ResponsiveContainer width="100%" height="85%">
          <BarChart data={data?.departmentStats}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="tag_name" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
              itemStyle={{ color: '#fff' }}
            />
            <Bar dataKey="submissions" radius={[10, 10, 0, 0]}>
              {data?.departmentStats?.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'var(--primary)' : 'var(--accent)'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    );
  }

  // Mock data for breakdown if not provided
  const breakdownData = [
    { name: 'No of Dashboards Updated', value: 77, color: '#99e2f2' },
    { name: 'Deploy to GIFT', value: 13, color: '#fba484' },
    { name: 'No of Tasks Completed', value: 8, color: '#f88282' },
    { name: 'No of dashboards created', value: 1, color: '#c084fc' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '2rem', marginTop: '2rem' }}>
      {/* Line Chart with Area Fill */}
      <div className="card" style={{ height: '400px' }}>
        <h3 style={{ marginBottom: '2rem' }}>Task Completed (Recent Months)</h3>
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
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.2}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
            <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
            <YAxis hide />
            <Tooltip />
            <Area 
              type="monotone" 
              dataKey="points" 
              stroke="#3b82f6" 
              strokeWidth={3}
              fillOpacity={1} 
              fill="url(#colorPoints)" 
              label={{ position: 'top', fill: '#fff', fontSize: 14, fontWeight: 'bold' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Donut Chart Breakdown */}
      <div className="card" style={{ height: '400px' }}>
        <h3 style={{ marginBottom: '2rem' }}>Contribution Breakdown</h3>
        <ResponsiveContainer width="100%" height="85%">
          <PieChart>
            <Pie
              data={breakdownData}
              cx="50%"
              cy="50%"
              innerRadius={70}
              outerRadius={100}
              paddingAngle={5}
              dataKey="value"
            >
              {breakdownData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        {/* Simple Legend */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '1rem', fontSize: '0.75rem' }}>
          {breakdownData.map(d => (
            <div key={d.name} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: d.color }}></div>
              <span style={{ color: 'var(--text-muted)' }}>{d.name} ({d.value}%)</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InsightsChart;
