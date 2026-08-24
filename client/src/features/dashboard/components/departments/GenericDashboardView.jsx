import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { Send, Users, Calendar, Clock, Bug, CheckSquare, CheckCircle, Rocket, Activity } from 'lucide-react';
import ColorfulCard from '../common/ColorfulCard';
import DoubleMetricCard from '../common/DoubleMetricCard';

const getMetricIcon = (name) => {
  const lowercase = name.toLowerCase();
  if (lowercase.includes('bug') || lowercase.includes('error')) return <Bug />;
  if (lowercase.includes('time') || lowercase.includes('hour') || lowercase.includes('clock') || lowercase.includes('duration')) return <Clock />;
  if (lowercase.includes('complete') || lowercase.includes('done') || lowercase.includes('finish')) return <CheckSquare />;
  if (lowercase.includes('work') || lowercase.includes('task') || lowercase.includes('develop')) return <CheckCircle />;
  if (lowercase.includes('ai') || lowercase.includes('gpt') || lowercase.includes('copilot') || lowercase.includes('bot')) return <Rocket />;
  return <Activity />;
};

const GenericDashboardView = ({ data, department, formatDate, handleUsersCardClick, checklistChart }) => {
  const cardColors = [
    'from-purple-500 to-purple-700',
    'from-amber-500 to-amber-700',
    'from-rose-500 to-rose-700',
    'from-fuchsia-500 to-fuchsia-700',
    'from-orange-500 to-orange-700',
    'from-pink-500 to-pink-700',
    'from-emerald-500 to-emerald-700',
    'from-teal-500 to-teal-700'
  ];

  let metricsToConsider = (data.topKPIs || []).map(k => {
    const input = (data.checklistInputs || []).find(i => i.name === k.label);
    return {
      label: k.label,
      value: k.value,
      type: input?.type,
      isPercentage: input?.isPercentage,
      isTimeAverage: input?.isTimeAverage,
      isTaskAverage: input?.isTaskAverage
    };
  });

  const clockInMetric = metricsToConsider.find(k => k.label.toLowerCase() === 'daily clock in' || k.label.toLowerCase() === 'clock in');
  const clockOutMetric = metricsToConsider.find(k => k.label.toLowerCase() === 'daily clock out' || k.label.toLowerCase() === 'clock out');
  const showCombinedAttendance = clockInMetric && clockOutMetric;

  const metricsToRender = metricsToConsider.filter(k => {
    if (showCombinedAttendance) {
      return k.label.toLowerCase() !== clockInMetric.label.toLowerCase() && k.label.toLowerCase() !== clockOutMetric.label.toLowerCase();
    }
    return true;
  });

  const formatValue = (kpi) => {
    const lowercase = kpi.label.toLowerCase();
    if (kpi.isPercentage || kpi.type === 'Boolean' || lowercase.includes('rate') || lowercase.includes('percentage') || lowercase.includes('daily clock') || lowercase.includes('clock in') || lowercase.includes('clock out')) {
      return `${kpi.value}%`;
    }
    if (kpi.isTimeAverage || lowercase.includes('time') || lowercase.includes('hour') || lowercase.includes('clock') || lowercase.includes('duration') || lowercase.includes('trained')) {
      return `${kpi.value} hrs`;
    }
    if (kpi.isTaskAverage || lowercase.includes('tasks worked') || lowercase.includes('task worked')) {
      return `${kpi.value} tasks/day`;
    }
    return kpi.value;
  };

  const getUserLabel = () => {
    const deptUpper = department?.toUpperCase() || '';
    if (deptUpper === 'TESTING') return 'Testers';
    if (deptUpper === 'SALESFORCE') return 'Salesforce Developers';
    if (deptUpper === 'PUBLIC') return 'Public Users';
    return 'Users';
  };

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
          label={getUserLabel()} 
          value={data.usersCount || 0}
          onClick={handleUsersCardClick}
        />

        {showCombinedAttendance && (
          <DoubleMetricCard
            color="from-cyan-400 to-blue-600"
            icon={<Clock />}
            label="Attendance Rate"
            val1Label="Clock In"
            val1={`${clockInMetric.value}%`}
            val2Label="Clock Out"
            val2={`${clockOutMetric.value}%`}
          />
        )}

        {metricsToRender.map((kpi, idx) => {
          const displayValue = formatValue(kpi);
          const color = cardColors[idx % cardColors.length];
          return (
            <ColorfulCard
              key={idx}
              color={color}
              icon={getMetricIcon(kpi.label)}
              label={kpi.label}
              value={displayValue}
            />
          );
        })}

        <ColorfulCard 
          color="from-emerald-500 to-emerald-700" 
          icon={<Calendar />} 
          label="Latest Date" 
          value={formatDate(data.latestSubmissionDate)} 
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {checklistChart}

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

export default GenericDashboardView;
