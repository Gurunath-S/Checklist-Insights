import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Send, Users, CheckSquare, Calendar, Laptop } from 'lucide-react';
import ColorfulCard from '../common/ColorfulCard';
import DoubleMetricCard from '../common/DoubleMetricCard';

const ErodeInternDashboardView = ({ data, formatDate, handleUsersCardClick, checklistChart }) => {
  if (!data.erodeInternsData) return null;

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
          label="Interns" 
          value={data.usersCount || 0}
          onClick={handleUsersCardClick}
        />
        <DoubleMetricCard
          color="from-rose-500 to-rose-700"
          icon={<Laptop />}
          label="Headcount Roles"
          val1Label="Developers"
          val1={data.erodeInternsData?.developersCount || 0}
          val2Label="Testers"
          val2={data.erodeInternsData?.testersCount || 0}
        />
        <ColorfulCard 
          color="from-amber-500 to-amber-700" 
          icon={<CheckSquare />} 
          label="Tasks Completed / Day" 
          value={`${data.erodeInternsData?.tasksPerDay || 0}`} 
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

        {/* Tasks Completed by Users (Bar Chart) */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
          <h3 className="text-base font-bold text-white mb-4 text-center">Tasks Completed by Users</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <BarChart data={data.erodeInternsData.tasksCompletedByUser} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
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

export default ErodeInternDashboardView;
