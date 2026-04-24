import React from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell
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

  return (
    <div className="card" style={{ height: '400px', marginTop: '2rem' }}>
      <h3 style={{ marginBottom: '2rem' }}>Performance Points Trend</h3>
      <ResponsiveContainer width="100%" height="85%">
        <AreaChart data={data?.performanceTrend}>
          <defs>
            <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
          <XAxis dataKey="week" stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
          <YAxis stroke="var(--text-muted)" fontSize={12} tickLine={false} axisLine={false} />
          <Tooltip 
            contentStyle={{ background: '#1e293b', border: 'none', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.5)' }}
            itemStyle={{ color: '#fff' }}
          />
          <Area 
            type="monotone" 
            dataKey="points" 
            stroke="var(--primary)" 
            strokeWidth={3}
            fillOpacity={1} 
            fill="url(#colorPoints)" 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default InsightsChart;
