import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Send, Users, Calendar, TrendingUp, PlusCircle } from 'lucide-react';
import ColorfulCard from '../common/ColorfulCard';

const HRDashboardView = ({ data, formatDate, handleUsersCardClick, checklistChart }) => {
  const interviewMetric = data.checklistInputs?.find(k => k.name.toLowerCase().includes('interview conducted') || k.name.toLowerCase().includes('candidates interviewed'));
  const valInterviews = interviewMetric ? interviewMetric.value : 0;

  const taskMetric = data.checklistInputs?.find(k => k.name.toLowerCase() === 'no of tasks created for the team' || k.name.toLowerCase() === 'no of tasks created');
  const valTasks = taskMetric ? taskMetric.value : 0;

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6 gap-4">
        <ColorfulCard 
          color="from-indigo-600 to-indigo-800" 
          icon={<Send />} 
          label="Total Submissions" 
          value={data.submissionsCount || 0} 
        />
        <ColorfulCard 
          color="from-purple-500 to-purple-700" 
          icon={<Users />} 
          label="Employees" 
          value={data.usersCount || 0}
          onClick={handleUsersCardClick}
        />
        <ColorfulCard 
          color="from-purple-500 to-purple-700" 
          icon={<TrendingUp />} 
          label="Completion Rate" 
          value={`${data.completionRate?.toFixed(1) || '0.0'}%`} 
        />
        <ColorfulCard 
          color="from-amber-500 to-amber-700" 
          icon={<Users />} 
          label="Interviews / Day" 
          value={`${valInterviews} interviews`} 
        />
        <ColorfulCard 
          color="from-rose-500 to-rose-700" 
          icon={<PlusCircle />} 
          label="Tasks Added / Day" 
          value={`${valTasks} tasks`} 
        />
        <ColorfulCard 
          color="from-emerald-500 to-emerald-700" 
          icon={<Calendar />} 
          label="Last Submitted Date" 
          value={formatDate(data.latestSubmissionDate)} 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {checklistChart}

        {data.hrData && (
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
            <h3 className="text-base font-bold text-white mb-4 text-center">Interviews Conducted (Recent Months)</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <AreaChart data={data.hrData.interviewsTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInterviews" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorInterviews)" dot={{r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 12, fontWeight: 'bold' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default HRDashboardView;
