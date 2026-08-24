import React from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Send, Users, CheckSquare, Calendar, TrendingUp } from 'lucide-react';
import ColorfulCard from '../common/ColorfulCard';

const DataAnalyticsDashboardView = ({ 
  data, 
  formatDate, 
  handleUsersCardClick, 
  checklistChart,
  analyticsTimeOption,
  setAnalyticsTimeOption
}) => {
  if (!data.analyticsData) return null;

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-4">
        <ColorfulCard 
          color="from-indigo-600 to-indigo-800" 
          icon={<Send />} 
          label="Total Submissions" 
          value={data.submissionsCount || 0} 
        />
        <ColorfulCard 
          color="from-purple-500 to-purple-700" 
          icon={<Users />} 
          label="Analysts" 
          value={data.usersCount || 0}
          onClick={handleUsersCardClick}
        />
        <ColorfulCard 
          color="from-rose-500 to-rose-700" 
          icon={<CheckSquare />} 
          label="Task / Day" 
          value={data.analyticsData?.tasksPerDay || 0} 
        />
        <ColorfulCard 
          color="from-emerald-500 to-emerald-700" 
          icon={<Calendar />} 
          label="Last Submitted Date" 
          value={formatDate(data.latestSubmissionDate)} 
        />
        <ColorfulCard 
          color="from-amber-500 to-amber-700" 
          icon={<TrendingUp />} 
          label="Completion Rate" 
          value={`${data.completionRate?.toFixed(1) || '0.0'}%`} 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {checklistChart}

        {/* Avg Dashboard Updated Items */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-white">Avg Dashboard Updated Items</h3>
            <div className="flex gap-1.5 bg-white/5 border border-glass-border p-0.5 rounded-xl">
              {['monthly', 'yearly'].map(timeOpt => (
                <button
                  key={timeOpt}
                  onClick={() => setAnalyticsTimeOption(timeOpt)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all capitalize cursor-pointer ${
                    analyticsTimeOption === timeOpt 
                      ? 'bg-primary text-white shadow-md' 
                      : 'text-text-muted hover:text-white'
                  }`}
                >
                  {timeOpt}
                </button>
              ))}
            </div>
          </div>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <AreaChart 
                data={analyticsTimeOption === 'monthly' ? data.analyticsData.dashboardUpdatedMonthly : data.analyticsData.dashboardUpdatedYearly} 
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorDashUpdated" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorDashUpdated)" dot={{r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Tasks Completed by Analysts */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
          <h3 className="text-base font-bold text-white mb-4 text-center">Tasks Completed by Analysts</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <BarChart data={data.analyticsData.tasksCompletedByUser} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val} />
                <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataAnalyticsDashboardView;
