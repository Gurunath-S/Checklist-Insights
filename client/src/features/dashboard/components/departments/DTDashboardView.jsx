import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Send, Users, PlusCircle, TrendingUp, Calendar } from 'lucide-react';
import ColorfulCard from '../common/ColorfulCard';

const DTDashboardView = ({ data, formatDate, handleUsersCardClick, checklistChart }) => {
  if (!data.dtData) return null;

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-4">
        <ColorfulCard 
          color="from-indigo-600 to-indigo-800" 
          icon={<Send />} 
          label="Submissions" 
          value={data.submissionsCount || 0} 
        />
        <ColorfulCard 
          color="from-purple-500 to-purple-700" 
          icon={<Users />} 
          label="DT Specialists" 
          value={data.usersCount || 0}
          onClick={handleUsersCardClick}
        />
        <ColorfulCard 
          color="from-rose-500 to-rose-700" 
          icon={<PlusCircle />} 
          label="Tasks Entered" 
          value={`${data.dtData?.tasksEntered || 0}`} 
        />
        <ColorfulCard 
          color="from-amber-500 to-amber-700" 
          icon={<TrendingUp />} 
          label="Tasks Completed" 
          value={`${data.dtData?.tasksCompleted || 0}`} 
        />
        <ColorfulCard 
          color="from-emerald-500 to-emerald-700" 
          icon={<Calendar />} 
          label="Latest Submitted Date" 
          value={formatDate(data.latestSubmissionDate)} 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {checklistChart}

        {/* Tasks Created (Recent Months) */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
          <h3 className="text-base font-bold text-white mb-4 text-center">Tasks Created (Recent Months)</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <AreaChart data={data.dtData.tasksCreatedTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorTasksCreated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ec4899" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#ec4899" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="value" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorTasksCreated)" dot={{r: 6, fill: '#ec4899', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 12, fontWeight: 'bold' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Submissions (Recent Months) */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
          <h3 className="text-base font-bold text-white mb-4 text-center">Submissions (Recent Months)</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <AreaChart data={data.recentMonths} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorSub" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="submissions" stroke="#3b82f6" strokeWidth={3} strokeDasharray="5 5" fillOpacity={1} fill="url(#colorSub)" dot={{r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 12, fontWeight: 'bold' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DTDashboardView;
