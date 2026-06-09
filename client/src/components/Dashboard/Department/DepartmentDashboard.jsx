import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { Book, CheckCircle, TrendingUp, Calendar, ChevronDown, List, Activity, Send, Clock, Bug, CheckSquare, Rocket, Users, PlusCircle } from 'lucide-react';
import LoadingState from '../../UI/LoadingState';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const getMetricIcon = (name) => {
  const lowercase = name.toLowerCase();
  if (lowercase.includes('bug') || lowercase.includes('error')) return <Bug />;
  if (lowercase.includes('time') || lowercase.includes('hour') || lowercase.includes('clock') || lowercase.includes('duration')) return <Clock />;
  if (lowercase.includes('complete') || lowercase.includes('done') || lowercase.includes('finish')) return <CheckSquare />;
  if (lowercase.includes('work') || lowercase.includes('task') || lowercase.includes('develop')) return <CheckCircle />;
  if (lowercase.includes('ai') || lowercase.includes('gpt') || lowercase.includes('copilot') || lowercase.includes('bot')) return <Rocket />;
  return <Activity />;
};

const ColorfulCard = ({ color, icon, label, value }) => (
  <div className={`bg-linear-to-br ${color} rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-white shadow-xl shadow-black/20 hover:-translate-y-2 hover:scale-105 transition-all duration-300 cursor-default aspect-square lg:aspect-auto min-h-[100px]`}>
    {React.cloneElement(icon, { size: 24, className: "opacity-90" })}
    <span className="text-[0.7rem] font-bold uppercase tracking-wide opacity-80 text-center truncate w-full" title={label}>{label}</span>
    <span className="text-xl font-extrabold">{value}</span>
  </div>
);

const DoubleMetricCard = ({ color, icon, label, val1Label, val1, val2Label, val2 }) => (
  <div className={`bg-linear-to-br ${color} rounded-2xl p-4 flex flex-col justify-between text-white shadow-xl shadow-black/20 hover:-translate-y-2 hover:scale-105 transition-all duration-300 cursor-default aspect-square lg:aspect-auto min-h-[100px]`}>
    <div className="flex items-center justify-between gap-2 w-full mb-1">
      <span className="text-[0.7rem] font-bold uppercase tracking-wide opacity-80 truncate" title={label}>{label}</span>
      {React.cloneElement(icon, { size: 16, className: "opacity-90 shrink-0" })}
    </div>
    <div className="flex items-center justify-between gap-2 mt-auto w-full">
      <div className="flex flex-col items-center flex-1 min-w-0">
        <span className="text-[8px] font-semibold uppercase opacity-75 tracking-wider mb-0.5 truncate w-full text-center" title={val1Label}>{val1Label}</span>
        <span className="text-base font-black truncate">{val1}</span>
      </div>
      <div className="w-[1px] h-7 bg-white/20 shrink-0"></div>
      <div className="flex flex-col items-center flex-1 min-w-0">
        <span className="text-[8px] font-semibold uppercase opacity-75 tracking-wider mb-0.5 truncate w-full text-center" title={val2Label}>{val2Label}</span>
        <span className="text-base font-black truncate">{val2}</span>
      </div>
    </div>
  </div>
);

const SpeedometerGauge = ({ value, title }) => {
  const data = [
    { name: 'Achieved', value: value },
    { name: 'Remaining', value: Math.max(0, 100 - value) }
  ];

  return (
    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px] items-center justify-center relative overflow-hidden">
      <h3 className="text-base font-bold text-white mb-2 text-center w-full">{title}</h3>
      <div className="flex-1 w-full flex items-center justify-center relative">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
          <PieChart>
            <defs>
              <linearGradient id="gaugeColor" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#10b981" />
                <stop offset="100%" stopColor="#3b82f6" />
              </linearGradient>
            </defs>
            <Pie
              data={data}
              cx="50%"
              cy="75%"
              startAngle={180}
              endAngle={0}
              innerRadius="75%"
              outerRadius="100%"
              dataKey="value"
              stroke="none"
            >
              <Cell key="cell-0" fill="url(#gaugeColor)" />
              <Cell key="cell-1" fill="rgba(255,255,255,0.08)" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-x-0 bottom-12 flex flex-col items-center justify-center">
          <span className="text-4xl font-extrabold text-white">{value}%</span>
          <span className="text-xs font-bold text-text-muted mt-1">Goal Achievement</span>
        </div>
      </div>
    </div>
  );
};

const FunnelChart = ({ data }) => {
  const colors = ['#3b82f6', '#8b5cf6', '#ec4899'];
  return (
    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
      <h3 className="text-base font-bold text-white mb-4 text-center">Max Campaign Funnel</h3>
      <div className="flex-1 w-full min-h-0">
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
          <BarChart
            data={data}
            layout="vertical"
            margin={{ top: 20, right: 40, left: 30, bottom: 20 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
            <XAxis type="number" stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
            <YAxis
              dataKey="stage"
              type="category"
              stroke="var(--color-text-muted)"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <RechartsTooltip
              contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
              itemStyle={{ color: '#fff' }}
            />
            <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} barSize={32}>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

const DepartmentDashboard = ({ department, adminStartDate, adminEndDate, onDoubleClickItem }) => {
  const isHR = department && (department.toUpperCase() === 'HUMAN RESOURCE' || department.toUpperCase() === 'HUMAN_RESOURCE' || department.toUpperCase() === 'HR');
  const isSales = department && department.toUpperCase() === 'SALES';
  const isDT = department && (department.toUpperCase() === 'DIGITAL TRANSFORMATION' || department.toUpperCase() === 'DIGITAL_TRANSFORMATION' || department.toUpperCase() === 'DT');
  const isMarketing = department && (department.toUpperCase() === 'MARKETING' || department.toUpperCase() === 'MARKETTNG');
  const isDev = department && (department.toUpperCase() === 'FULL_STACK_DEVELOPER' || department.toUpperCase() === 'DEVELOPMENT' || department.toUpperCase() === 'DEV');
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isLimitDropdownOpen, setIsLimitDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [chartData, setChartData] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingChart, setLoadingChart] = useState(false);
  const [meetingsLimit, setMeetingsLimit] = useState(3);
  const [closuresLimit, setClosuresLimit] = useState(3);

  useEffect(() => {
    const fetchDepartmentData = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const params = {};
        if (adminStartDate) params.startDate = adminStartDate;
        if (adminEndDate) params.endDate = adminEndDate;

        const res = await axios.get(`${API_BASE}/insights/admin/department/${department}`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        setData(res.data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch department data", err);
        setError("Failed to load department insights.");
      } finally {
        setLoading(false);
      }
    };

    if (department) {
      fetchDepartmentData();
    }
  }, [department, adminStartDate, adminEndDate]);

  useEffect(() => {
    Promise.resolve().then(() => setPage(1));
  }, [department, adminStartDate, adminEndDate]);

  useEffect(() => {
    if (!department) return;

    const fetchChartData = async () => {
      setLoadingChart(true);
      try {
        const token = localStorage.getItem('token');
        const params = { page, limit };
        if (adminStartDate) params.startDate = adminStartDate;
        if (adminEndDate) params.endDate = adminEndDate;

        const res = await axios.get(`${API_BASE}/insights/admin/department/${department}/chart-data`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        setChartData(res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
      } catch (err) {
        console.error('Error fetching paginated department chart data:', err);
      } finally {
        setLoadingChart(false);
      }
    };

    fetchChartData();
  }, [department, page, limit, adminStartDate, adminEndDate]);

  if (loading) return <LoadingState />;
  if (error) return <div className="text-danger text-center p-8">{error}</div>;
  if (!data) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#ec4899', '#8b5cf6'];

  const renderChecklistByInputs = () => (
    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px] relative">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base font-bold text-white">Top {limit} Checklist by Inputs in this department</h3>
        
        <div className="flex items-center gap-2">
          <div className="relative">
            <button 
              onClick={() => setIsLimitDropdownOpen(!isLimitDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-bg-card backdrop-blur-xl border border-glass-border rounded-xl text-[11px] font-bold text-white shadow-lg hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
            >
              <List size={12} className="text-accent" />
              <span>Top {limit}</span>
              <ChevronDown size={12} className={`transition-transform duration-300 ${isLimitDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isLimitDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsLimitDropdownOpen(false)}></div>
                <div className="absolute right-0 mt-2 w-32 bg-bg-card backdrop-blur-2xl border border-glass-border rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="text-[10px] font-bold text-white/40 px-2.5 py-1.5 uppercase tracking-wider border-b border-glass-border/30 mb-1">
                    Show Rows
                  </div>
                  {[5, 10, 20, 50].map((val) => (
                    <button
                      key={val}
                      onClick={() => { setLimit(val); setPage(1); setIsLimitDropdownOpen(false); }}
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-colors flex items-center justify-between ${limit === val ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
                    >
                      <span>Top {val}</span>
                      {limit === val && <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          
          <div className="flex items-center gap-1 bg-bg-card backdrop-blur-xl border border-glass-border rounded-xl px-1 py-1 shadow-lg">
            <button 
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page === 1}
              className="px-2 py-0.5 text-xs font-bold text-white disabled:opacity-30 hover:bg-white/10 rounded-lg cursor-pointer transition-all"
            >
              &lt;
            </button>
            <span className="text-[10px] font-bold px-1 text-white/70 min-w-[36px] text-center">
              {page} / {totalPages || 1}
            </span>
            <button 
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="px-2 py-0.5 text-xs font-bold text-white disabled:opacity-30 hover:bg-white/10 rounded-lg cursor-pointer transition-all"
            >
              &gt;
            </button>
          </div>
        </div>
      </div>

      <div className="flex-1 w-full min-h-0">
        {loadingChart ? (
          <div className="w-full h-full flex flex-col items-center justify-center text-text-muted">
            <Activity size={32} className="opacity-30 animate-pulse text-primary mb-2" />
            <span className="text-xs font-bold">Loading Data...</span>
          </div>
        ) : chartData.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
            No data available for this range.
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 40 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="name" 
                stroke="var(--color-text-muted)" 
                fontSize={10} 
                tickLine={false} 
                axisLine={false} 
                angle={-45}
                textAnchor="end"
                interval={0}
                tickFormatter={(val) => val.length > 15 ? val.substring(0, 15) + '...' : val}
              />
              <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
              <RechartsTooltip 
                contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
                itemStyle={{ color: '#fff' }}
                cursor={{fill: 'rgba(255,255,255,0.05)'}}
              />
              <Bar 
                dataKey="value" 
                radius={[4, 4, 0, 0]} 
                barSize={40}
                onDoubleClick={(data) => {
                  if (data && data.name) {
                    onDoubleClickItem?.(data.name);
                  }
                }}
                style={{ cursor: 'pointer' }}
              >
                {chartData.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                    style={{ cursor: 'pointer' }}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-xl font-bold text-white capitalize">{department.replace(/_/g, ' ')}</h2>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {isDev ? (
          <>
            <ColorfulCard 
              color="from-indigo-600 to-indigo-800" 
              icon={<Send />} 
              label="Submissions" 
              value={data.submissionsCount || 0} 
            />
            <ColorfulCard 
              color="from-purple-500 to-purple-700" 
              icon={<Users />} 
              label="Developers" 
              value={data.devData?.developersCount || 0} 
            />
            <ColorfulCard 
              color="from-rose-500 to-rose-700" 
              icon={<CheckSquare />} 
              label="Tasks Completed / Day" 
              value={data.devData?.tasksPerDay || 0} 
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
          </>
        ) : isHR ? (
          <>
            <ColorfulCard 
              color="from-indigo-600 to-indigo-800" 
              icon={<Send />} 
              label="Total Submissions" 
              value={data.submissionsCount || 0} 
            />
            <ColorfulCard 
              color="from-purple-500 to-purple-700" 
              icon={<TrendingUp />} 
              label="Completion Rate" 
              value={`${data.completionRate?.toFixed(1) || '0.0'}%`} 
            />
            {(() => {
              const interviewMetric = data.checklistInputs?.find(k => k.name.toLowerCase().includes('interview conducted') || k.name.toLowerCase().includes('candidates interviewed'));
              const val = interviewMetric ? interviewMetric.value : 0;
              return (
                <ColorfulCard 
                  color="from-amber-500 to-amber-700" 
                  icon={<Users />} 
                  label="Interviews / Day" 
                  value={`${val} interviews`} 
                />
              );
            })()}
            {(() => {
              const taskMetric = data.checklistInputs?.find(k => k.name.toLowerCase() === 'no of tasks created for the team' || k.name.toLowerCase() === 'no of tasks created');
              const val = taskMetric ? taskMetric.value : 0;
              return (
                <ColorfulCard 
                  color="from-rose-500 to-rose-700" 
                  icon={<PlusCircle />} 
                  label="Tasks Added / Day" 
                  value={`${val} tasks`} 
                />
              );
            })()}
            <ColorfulCard 
              color="from-emerald-500 to-emerald-700" 
              icon={<Calendar />} 
              label="Last Submitted Date" 
              value={formatDate(data.latestSubmissionDate)} 
            />
          </>
        ) : isDT ? (
          <>
            <ColorfulCard 
              color="from-indigo-600 to-indigo-800" 
              icon={<Send />} 
              label="Submissions" 
              value={data.submissionsCount || 0} 
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
          </>
        ) : isMarketing ? (
          <>
            <ColorfulCard 
              color="from-indigo-600 to-indigo-800" 
              icon={<Send />} 
              label="Total Submissions" 
              value={data.submissionsCount || 0} 
            />
            <ColorfulCard 
              color="from-blue-500 to-indigo-700" 
              icon={<TrendingUp />} 
              label="Impressions" 
              value={data.marketingData?.impressionsTotal || 0} 
            />
            <ColorfulCard 
              color="from-purple-500 to-purple-700" 
              icon={<Activity />} 
              label="CTA Clicks" 
              value={data.marketingData?.ctaClicksTotal || 0} 
            />
            <ColorfulCard 
              color="from-pink-500 to-pink-700" 
              icon={<CheckCircle />} 
              label="Conversions" 
              value={data.marketingData?.conversionsTotal || 0} 
            />
            <DoubleMetricCard
              color="from-amber-500 to-orange-700"
              icon={<Rocket />}
              label="Campaign Funnel"
              val1Label="Launched"
              val1={data.marketingData?.campaignsCount || 0}
              val2Label="Boosts"
              val2={data.marketingData?.boostsCount || 0}
            />
          </>
        ) : isSales ? (
          <>
            <ColorfulCard 
              color="from-indigo-600 to-indigo-800" 
              icon={<Send />} 
              label="Submissions" 
              value={data.submissionsCount || 0} 
            />
            <ColorfulCard 
              color="from-purple-500 to-purple-700" 
              icon={<Users />} 
              label="Sales Persons" 
              value={data.salesData?.totalSalesPersons || 0} 
            />
            <ColorfulCard 
              color="from-emerald-500 to-emerald-700" 
              icon={<CheckCircle />} 
              label="Task Completed" 
              value={data.salesData?.totalTasksCompleted || 0} 
            />
            <ColorfulCard 
              color="from-rose-500 to-rose-700" 
              icon={<TrendingUp />} 
              label="Closures" 
              value={data.salesData?.totalClosures || 0} 
            />
            <ColorfulCard 
              color="from-amber-500 to-amber-700" 
              icon={<Calendar />} 
              label="Last Submitted" 
              value={formatDate(data.latestSubmissionDate)} 
            />
          </>
        ) : (
          <>
            <ColorfulCard 
              color="from-indigo-600 to-indigo-800" 
              icon={<Send />} 
              label="Submissions" 
              value={data.submissionsCount || 0} 
            />

            {(() => {
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

              return (
                <>
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
                </>
              );
            })()}

            <ColorfulCard 
              color="from-emerald-500 to-emerald-700" 
              icon={<Calendar />} 
              label="Latest Date" 
              value={formatDate(data.latestSubmissionDate)} 
            />
          </>
        )}
      </div>

      {/* Charts Row */}
      {isMarketing && data.marketingData ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <FunnelChart data={data.marketingData.funnel} />
          <SpeedometerGauge value={data.marketingData.goalAchievement} title="Goal Achievement" />
          
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
            <h3 className="text-base font-bold text-white mb-4 text-center">Campaigns Launched</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <AreaChart data={data.marketingData.campaignsLaunched} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorCampaigns" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorCampaigns)" dot={{r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
            <h3 className="text-base font-bold text-white mb-4 text-center">Positive Reaction from Employees</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <AreaChart data={data.marketingData.employeeReactions} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorEmployees" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorEmployees)" dot={{r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
            <h3 className="text-base font-bold text-white mb-4 text-center">Positive Reaction from Partners</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <AreaChart data={data.marketingData.partnerReactions} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorPartners" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="value" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorPartners)" dot={{r: 6, fill: '#ec4899', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {renderChecklistByInputs()}
        </div>
      ) : isDev && data.devData ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {renderChecklistByInputs()}

          {/* Tasks Completed by Users (Bar Chart) */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
            <h3 className="text-base font-bold text-white mb-4 text-center">Tasks Completed by Users</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <BarChart data={data.devData.tasksCompletedByUser} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
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

          {/* Deployed Build Trend (Area Chart) */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
            <h3 className="text-base font-bold text-white mb-4 text-center">Deployed Build Trend</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <AreaChart data={data.devData.deployedBuildTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorDevBuilds" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorDevBuilds)" dot={{r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Deployed Build by Developer (Bar Chart) */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
            <h3 className="text-base font-bold text-white mb-4 text-center">Deployed Build by Developer</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <BarChart data={data.devData.deployedBuildByUser} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} tickFormatter={(val) => val.length > 10 ? val.substring(0, 10) + '...' : val} />
                  <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="#ec4899" radius={[6, 6, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      ) : isDT && data.dtData ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Checklist by Inputs */}
          {renderChecklistByInputs()}

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
      ) : isSales && data.salesData ? (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* Chart 1: Prospects Identified (Recent Months) */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
            <h3 className="text-base font-bold text-white mb-4 text-center">Prospects Identified (Recent Months)</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <AreaChart data={data.salesData.prospectsIdentified} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorProspects" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorProspects)" dot={{r: 6, fill: '#3b82f6', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 2: Warm leads- Colleges (Recent Months) */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
            <h3 className="text-base font-bold text-white mb-4 text-center">Warm leads- Colleges (Recent Months)</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <AreaChart data={data.salesData.warmLeadsColleges} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorWarmLeads" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="value" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorWarmLeads)" dot={{r: 6, fill: '#10b981', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 3: In- Person Meeting Attended (Recent Months) */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
            <h3 className="text-base font-bold text-white mb-4 text-center">In- Person Meeting Attended (Recent Months)</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <AreaChart data={data.salesData.meetingsTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorMeetings" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} fillOpacity={1} fill="url(#colorMeetings)" dot={{r: 6, fill: '#8b5cf6', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 4: In- Person Meeting Attended by Sales Person */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white">In- Person Meeting Attended by Sales Person</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Show:</span>
                <select
                  value={meetingsLimit}
                  onChange={(e) => setMeetingsLimit(Number(e.target.value))}
                  className="bg-white/5 border border-glass-border rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:border-primary/50 cursor-pointer"
                >
                  <option value={3} className="bg-slate-900 text-white">Top 3</option>
                  <option value={5} className="bg-slate-900 text-white">Top 5</option>
                  <option value={10} className="bg-slate-900 text-white">Top 10</option>
                  <option value={9999} className="bg-slate-900 text-white">All</option>
                </select>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <BarChart data={data.salesData.meetingsByUser.slice(0, meetingsLimit)} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} width={130} interval={0} />
                  <RechartsTooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={meetingsLimit <= 3 ? 24 : meetingsLimit <= 5 ? 18 : 12} label={{ position: 'right', fill: '#fff', fontSize: 10, fontWeight: 'bold' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 5: Closure made by month and year */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
            <h3 className="text-base font-bold text-white mb-4 text-center">Closure made by month and year</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <AreaChart data={data.salesData.closuresTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorClosures" x1="0" y1="0" x2="0" y2="1">
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
                  <Area type="monotone" dataKey="value" stroke="#ec4899" strokeWidth={3} fillOpacity={1} fill="url(#colorClosures)" dot={{r: 6, fill: '#ec4899', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 6: Closure made by Sales Person */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white">Closure made by Sales Person</h3>
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] text-text-muted uppercase font-bold tracking-wider">Show:</span>
                <select
                  value={closuresLimit}
                  onChange={(e) => setClosuresLimit(Number(e.target.value))}
                  className="bg-white/5 border border-glass-border rounded-xl px-2 py-1 text-xs text-white focus:outline-none focus:border-primary/50 cursor-pointer"
                >
                  <option value={3} className="bg-slate-900 text-white">Top 3</option>
                  <option value={5} className="bg-slate-900 text-white">Top 5</option>
                  <option value={10} className="bg-slate-900 text-white">Top 10</option>
                  <option value={9999} className="bg-slate-900 text-white">All</option>
                </select>
              </div>
            </div>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <BarChart data={data.salesData.closuresByUser.slice(0, closuresLimit)} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                  <XAxis type="number" stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis dataKey="name" type="category" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} width={130} interval={0} />
                  <RechartsTooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Bar dataKey="value" fill="#10b981" radius={[0, 4, 4, 0]} barSize={closuresLimit <= 3 ? 24 : closuresLimit <= 5 ? 18 : 12} label={{ position: 'right', fill: '#fff', fontSize: 10, fontWeight: 'bold' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 7: Follow ups (Recent Months) */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-[350px]">
            <h3 className="text-base font-bold text-white mb-4 text-center">No of Follow ups (Recent Months)</h3>
            <div className="flex-1 w-full min-h-0">
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <AreaChart data={data.salesData.followUpsTrend} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFollowUps" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis stroke="#fff" fontSize={11} tickLine={false} axisLine={false} />
                  <RechartsTooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                    itemStyle={{ color: '#fff' }}
                  />
                  <Area type="monotone" dataKey="value" stroke="#f59e0b" strokeWidth={3} fillOpacity={1} fill="url(#colorFollowUps)" dot={{r: 6, fill: '#f59e0b', stroke: '#fff', strokeWidth: 2}} activeDot={{r: 8}} label={{ position: 'top', fill: '#fff', fontSize: 11, fontWeight: 'bold' }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Chart 8: Top 10 checklist by input */}
          {renderChecklistByInputs()}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 h-[380px]">
          {/* Checklist by Inputs */}
          {renderChecklistByInputs()}

          {isHR && data.hrData ? (
            <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-full">
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
          ) : (
            <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-full">
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
          )}
        </div>
      )}
    </div>
  );
};

export default DepartmentDashboard;
