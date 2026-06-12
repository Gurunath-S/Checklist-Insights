import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell
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

import ColorfulCard from './ColorfulCard';
import DoubleMetricCard from './DoubleMetricCard';
import ChecklistExplorer from '../Charts/ChecklistExplorer';

const OrganisationDashboard = ({ organisation, adminStartDate, adminEndDate, onBack }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [isLimitDropdownOpen, setIsLimitDropdownOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [chartData, setChartData] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingChart, setLoadingChart] = useState(false);

  useEffect(() => {
    const fetchOrganisationData = async () => {
      Promise.resolve().then(() => setLoading(true));
      try {
        const token = localStorage.getItem('token');
        const params = {};
        if (adminStartDate) params.startDate = adminStartDate;
        if (adminEndDate) params.endDate = adminEndDate;

        const res = await axios.get(`${API_BASE}/insights/admin/organisation/${organisation.id}`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        setData(res.data);
        setError(null);
      } catch (err) {
        console.error("Failed to fetch organisation data", err);
        setError("Failed to load domain insights.");
      } finally {
        setLoading(false);
      }
    };

    if (organisation?.id) {
      fetchOrganisationData();
    }
  }, [organisation?.id, adminStartDate, adminEndDate]);

  useEffect(() => {
    Promise.resolve().then(() => setPage(1));
  }, [organisation?.id, adminStartDate, adminEndDate]);

  useEffect(() => {
    if (!organisation?.id) return;

    const fetchChartData = async () => {
      Promise.resolve().then(() => setLoadingChart(true));
      try {
        const token = localStorage.getItem('token');
        const params = { page, limit };
        if (adminStartDate) params.startDate = adminStartDate;
        if (adminEndDate) params.endDate = adminEndDate;

        const res = await axios.get(`${API_BASE}/insights/admin/organisation/${organisation.id}/chart-data`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        setChartData(res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
      } catch (err) {
        console.error('Error fetching paginated organisation chart data:', err);
      } finally {
        setLoadingChart(false);
      }
    };

    fetchChartData();
  }, [organisation?.id, page, limit, adminStartDate, adminEndDate]);

  if (loading) return <LoadingState />;
  if (error) return <div className="text-danger text-center p-8">{error}</div>;
  if (!data) return null;

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  const COLORS = ['#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#ec4899', '#8b5cf6'];

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <button 
            type="button" 
            onClick={onBack}
            className="text-xs text-text-muted hover:text-white transition-all cursor-pointer mb-2 block font-black uppercase tracking-widest"
          >
            &larr; Back to Overview
          </button>
          <h2 className="text-xl font-bold text-white capitalize">{data.organisationName}</h2>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
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
              {metricsToRender.map((kpi, idx) => (
                <ColorfulCard 
                  key={idx}
                  color={cardColors[idx % cardColors.length]}
                  icon={getMetricIcon(kpi.label)}
                  label={kpi.label}
                  value={formatValue(kpi)}
                />
              ))}
            </>
          );
        })()}

        <ColorfulCard 
          color="from-emerald-500 to-emerald-700" 
          icon={<Calendar />} 
          label="Last Submitted Date" 
          value={formatDate(data.latestSubmissionDate)} 
        />
      </div>

      {/* Main Charts & Breakdown Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Trend Area Chart (Left) */}
        <div className="lg:col-span-7 bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-5 shadow-xl space-y-4">
          <div>
            <h3 className="text-sm font-black uppercase tracking-widest text-white">Submission Trends</h3>
            <p className="text-[10px] text-text-muted mt-0.5">Submission volumes over time</p>
          </div>
          
          <div className="h-[280px] w-full text-xs">
            {(!data.recentMonths || data.recentMonths.length === 0) ? (
              <div className="h-full flex items-center justify-center text-text-muted font-semibold">
                No submissions data available for the charts.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <AreaChart data={data.recentMonths} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="orgSubmissionsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0.01}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 10 }} />
                  <RechartsTooltip 
                    contentStyle={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                    labelClassName="text-white font-bold"
                    itemStyle={{ color: 'var(--color-primary, #6366f1)' }}
                  />
                  <Area type="monotone" dataKey="submissions" name="Submissions" stroke="var(--color-primary, #6366f1)" strokeWidth={2} fillOpacity={1} fill="url(#orgSubmissionsGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Paginated Bar Chart (Right) */}
        <div className="lg:col-span-5 bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black uppercase tracking-widest text-white">Metrics Distribution</h3>
              <p className="text-[10px] text-text-muted mt-0.5">Submissions volume by checklists</p>
            </div>
            
            {/* Pagination Size Dropdown */}
            <div className="relative">
              <button 
                type="button"
                onClick={() => setIsLimitDropdownOpen(!isLimitDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-glass-border rounded-xl text-[10px] text-white font-bold hover:bg-white/10 transition-all cursor-pointer"
              >
                <span>Show {limit}</span>
                <ChevronDown size={12} className={`text-text-muted transition-transform duration-300 ${isLimitDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              {isLimitDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsLimitDropdownOpen(false)}></div>
                  <div className="absolute right-0 mt-1 w-24 bg-bg-card border border-glass-border rounded-xl p-1 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    {[5, 10, 15, 20].map((val) => (
                      <button 
                        key={val} 
                        type="button" 
                        onClick={() => { setLimit(val); setPage(1); setIsLimitDropdownOpen(false); }} 
                        className={`w-full text-left px-2.5 py-1.5 rounded-lg text-[10px] transition-all hover:bg-white/5 ${limit === val ? 'bg-primary/15 text-white font-black' : 'text-text-muted'}`}
                      >
                        Show {val}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="h-[220px] w-full text-xs relative">
            {loadingChart ? (
              <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-xs rounded-2xl">
                <LoadingState />
              </div>
            ) : chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-text-muted font-semibold border border-dashed border-glass-border rounded-2xl bg-white/2">
                No compliance metrics found.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 8 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fill: 'rgba(255,255,255,0.6)', fontSize: 8 }} />
                  <RechartsTooltip 
                    contentStyle={{ background: '#0a0f1d', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                    labelClassName="text-white font-bold"
                    itemStyle={{ color: 'var(--color-accent, #10b981)' }}
                  />
                  <Bar dataKey="value" fill="url(#orgMetricsGrad)" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                  <defs>
                    <linearGradient id="orgMetricsGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-accent, #10b981)" />
                      <stop offset="100%" stopColor="var(--color-accent-hover, #059669)" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Chart Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-glass-border/30 pt-3 text-[10px]">
              <button
                type="button"
                disabled={page === 1}
                onClick={() => setPage(p => Math.max(1, p - 1))}
                className="px-3 py-1.5 bg-white/5 border border-glass-border rounded-xl text-text-main font-bold hover:bg-white/10 transition-all disabled:opacity-40 disabled:hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-text-muted">Page <strong className="text-text-main font-black">{page}</strong> of <strong className="text-text-main font-black">{totalPages}</strong></span>
              <button
                type="button"
                disabled={page === totalPages}
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                className="px-3 py-1.5 bg-white/5 border border-glass-border rounded-xl text-text-main font-bold hover:bg-white/10 transition-all disabled:opacity-40 disabled:hover:bg-white/5 cursor-pointer disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Detailed Metrics List */}
      <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-5 shadow-xl space-y-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-widest text-white">Checklists Metric Breakdown</h3>
          <p className="text-[10px] text-text-muted mt-0.5">Average values for boolean (compliance %) and numeric checklist fields</p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-glass-border bg-white/5 text-[9px] font-black uppercase tracking-widest text-text-muted">
                <th className="px-6 py-4">Checklist Input</th>
                <th className="px-6 py-4">Input Type</th>
                <th className="px-6 py-4 text-center">Summary Metric / Value</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border/30">
              {(!data.checklistInputs || data.checklistInputs.length === 0) ? (
                <tr>
                  <td colSpan="3" className="px-6 py-8 text-center text-text-muted font-bold text-xs">
                    No metric data found for this range.
                  </td>
                </tr>
              ) : (
                data.checklistInputs.map((row, idx) => {
                  const lowercaseName = row.name.toLowerCase();
                  let displayVal = row.value;
                  
                  if (row.type === 'Boolean') {
                    displayVal = `${row.value}% compliance`;
                  } else if (row.isTimeAverage || lowercaseName.includes('time') || lowercaseName.includes('hour') || lowercaseName.includes('clock') || lowercaseName.includes('duration') || lowercaseName.includes('trained')) {
                    displayVal = `${row.value} hrs (average)`;
                  } else if (row.isTaskAverage || lowercaseName.includes('tasks worked') || lowercaseName.includes('task worked')) {
                    displayVal = `${row.value} tasks/day (average)`;
                  } else {
                    displayVal = `${row.value} (average)`;
                  }

                  return (
                    <tr key={idx} className="hover:bg-white/2 transition-colors">
                      <td className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider">{row.name}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                          row.type === 'Boolean' ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        }`}>
                          {row.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs font-black text-center text-accent">{displayVal}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Checklist trend explorer */}
      <ChecklistExplorer 
        organisationId={organisation?.id} 
        globalStartDate={adminStartDate} 
        globalEndDate={adminEndDate} 
      />
    </div>
  );
};

export default OrganisationDashboard;
