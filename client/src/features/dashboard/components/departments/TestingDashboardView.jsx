import React from 'react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Send, Users, CheckSquare, Calendar, TrendingUp } from 'lucide-react';
import ColorfulCard from '../common/ColorfulCard';

const TestingDashboardView = ({ 
  data, 
  formatDate, 
  handleUsersCardClick, 
  testingTimeOption,
  setTestingTimeOption
}) => {
  if (!data.testingData) return null;

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
          label="Testers" 
          value={data.usersCount || 0}
          onClick={handleUsersCardClick}
        />
        <ColorfulCard 
          color="from-rose-500 to-rose-700" 
          icon={<CheckSquare />} 
          label="Tasks Completed / Day" 
          value={data.testingData?.tasksPerDay || 0} 
        />
        <ColorfulCard 
          color="from-emerald-500 to-emerald-700" 
          icon={<Calendar />} 
          label="Latest Submitted Date" 
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
        {/* Top Checklist Items Chart */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
          <h3 className="text-base font-bold text-white mb-4 text-center">Top Checklist Items</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <BarChart data={data.testingData.topChecklistItems} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val} />
                <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Bar dataKey="value" fill="#3b82f6" radius={[6, 6, 0, 0]} barSize={24} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bugs in Manual Test Graph */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-bold text-white">Bugs in Manual Test</h3>
            <div className="flex gap-1.5 bg-white/5 border border-glass-border p-0.5 rounded-xl">
              {['daily', 'monthly', 'yearly'].map(timeOpt => (
                <button
                  key={timeOpt}
                  onClick={() => setTestingTimeOption(timeOpt)}
                  className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all capitalize cursor-pointer ${
                    testingTimeOption === timeOpt 
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
                data={
                  testingTimeOption === 'daily' 
                    ? data.testingData.bugsDaily 
                    : testingTimeOption === 'monthly' 
                      ? data.testingData.bugsMonthly 
                      : data.testingData.bugsYearly
                } 
                margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorBugsManual" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f43f5e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                  itemStyle={{ color: '#fff' }}
                />
                <Area type="monotone" dataKey="value" stroke="#f43f5e" strokeWidth={3} fillOpacity={1} fill="url(#colorBugsManual)" dot={{r: 6, fill: '#f43f5e', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TestingDashboardView;
