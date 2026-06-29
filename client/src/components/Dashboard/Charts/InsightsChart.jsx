import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { Activity, ChevronDown, BarChart2, LineChart, List } from 'lucide-react';
import ErrorBoundary from '../../UI/ErrorBoundary';

const DEPT_ORDER = {
  'HUMAN_RESOURCE': 1,
  'HR': 1,
  'DIGITAL_TRANSFORMATION': 2,
  'DT': 2,
  'SALES': 3,
  'MARKETING': 4,
  'FULL_STACK_DEVELOPER': 5,
  'DEVELOPMENT': 5,
  'POWER_BI_DEVELOPER': 6,
  'DATA_ANALYTICS': 6,
  'DATA ANALYTICS': 6,
  'TESTING': 7,
  'QA_TESTING': 7,
  'QA TESTING': 7,
  'SALESFORCE': 8,
  'ERODE_INTERN': 9,
  'ERODE_INTERNS': 9,
  'ERODE INTERNS': 9
};

const InsightsChart = ({ data, isAdmin, selectedMetrics = [], user, startDate, endDate, onSelectItemName, explorerRef }) => {
  const [activeChart, setActiveChart] = useState('checklist');
  const [isChartDropdownOpen, setIsChartDropdownOpen] = useState(false);
  const [isLimitDropdownOpen, setIsLimitDropdownOpen] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [chartData, setChartData] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingChart, setLoadingChart] = useState(false);

  // States for Contribution Breakdown Custom Filters & Local Metrics Choice
  const [breakdownSelectedMetrics, setBreakdownSelectedMetrics] = useState([]);
  const [isBreakdownDropdownOpen, setIsBreakdownDropdownOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('all'); // 'all', 'boolean', 'numeric'
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [topLimit, setTopLimit] = useState('all'); // 'all', '3', '5', '10'
  const [isTopLimitDropdownOpen, setIsTopLimitDropdownOpen] = useState(false);

  // New States: Metric Search and Weekly Submission Limit Filters
  const [metricSearch, setMetricSearch] = useState('');
  const [weeksLimit, setWeeksLimit] = useState(6); // Default to last 6 weeks
  const [isWeeksDropdownOpen, setIsWeeksDropdownOpen] = useState(false);

  // Sync breakdownSelectedMetrics with the main metrics initially
  useEffect(() => {
    if (selectedMetrics && selectedMetrics.length > 0) {
      setBreakdownSelectedMetrics(selectedMetrics);
    } else if (data?.itemStats) {
      setBreakdownSelectedMetrics(data.itemStats.map(m => m.name));
    }
  }, [selectedMetrics, data?.itemStats]);

  useEffect(() => {
    if (isAdmin || activeChart !== 'checklist' || !user?.id) return;
    
    const fetchChartData = async () => {
      setLoadingChart(true);
      try {
        const token = localStorage.getItem('token');
        const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';
        const params = { page, limit };
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        
        const res = await axios.get(`${API_BASE}/insights/personal/${user.id}/chart-data`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        setChartData(res.data.data || []);
        setTotalPages(res.data.totalPages || 1);
      } catch (err) {
        console.error('Error fetching paginated chart data:', err);
      } finally {
        setLoadingChart(false);
      }
    };
    
    fetchChartData();
  }, [activeChart, page, limit, startDate, endDate, user?.id, isAdmin]);

  // Memoize admin variables to prevent changing array references on each render
  const adminUsersByPositionTags = useMemo(() => {
    const tags = data?.usersByPositionTags || [];
    return [...tags].sort((a, b) => (DEPT_ORDER[a.name] || 999) - (DEPT_ORDER[b.name] || 999));
  }, [data?.usersByPositionTags]);
  const adminUsersByType = useMemo(() => data?.usersByType || [], [data?.usersByType]);
  const adminUsersByPosition = useMemo(() => {
    const positions = data?.usersByPosition || [];
    return [...positions].sort((a, b) => (DEPT_ORDER[a.name] || 999) - (DEPT_ORDER[b.name] || 999));
  }, [data?.usersByPosition]);

  // Memoize sliced performance trend to keep a stable reference
  const slicedPerformanceTrend = useMemo(() => {
    const trend = data?.performanceTrend || [
      { week: 'Nov 2025', points: 4 },
      { week: 'Dec 2025', points: 12 },
      { week: 'Jan 2026', points: 8 },
      { week: 'Feb 2026', points: 5 },
      { week: 'Mar 2026', points: 11 },
      { week: 'Apr 2026', points: 3 },
    ];
    return [...trend].slice(-weeksLimit);
  }, [data?.performanceTrend, weeksLimit]);

  // Memoize Contribution Breakdown data derivations
  const filteredMetricsData = useMemo(() => {
    return (data?.itemStats || [])
      .filter(item => {
        if (!breakdownSelectedMetrics.includes(item.name)) return false;
        if (categoryFilter === 'boolean') return item.type === 'Boolean';
        if (categoryFilter === 'numeric') return item.type === 'Numeric';
        return true;
      });
  }, [data?.itemStats, breakdownSelectedMetrics, categoryFilter]);

  const sortedMetricsData = useMemo(() => {
    return [...filteredMetricsData].sort((a, b) => b.value - a.value);
  }, [filteredMetricsData]);

  const slicedMetricsData = useMemo(() => {
    return topLimit === 'all' ? sortedMetricsData : sortedMetricsData.slice(0, Number(topLimit));
  }, [sortedMetricsData, topLimit]);

  const breakdownData = useMemo(() => {
    const totalValue = slicedMetricsData.reduce((acc, curr) => acc + curr.value, 0);
    const colors = [
      '#10b981', '#8b5cf6', '#f59e0b', '#f43f5e', '#06b6d4',
      '#d946ef', '#0ea5e9', '#14b8a6', '#6366f1', '#f97316',
      '#84cc16', '#ec4899'
    ];
    return slicedMetricsData.map((item, index) => {
      const percentage = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;
      return {
        name: item.name,
        value: item.value,
        percentage: percentage,
        color: colors[index % colors.length]
      };
    });
  }, [slicedMetricsData]);

  if (isAdmin) {
    const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6', '#10b981'];
    
    return (
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-4 h-auto lg:h-[500px]">

        {/* Middle Column: Two Stacked Pie Charts */}
        <div className="flex flex-col gap-4 h-full min-h-[400px]">
          {/* Pie Chart 1 */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex-1 flex flex-col relative overflow-hidden">
            <h3 className="text-sm font-bold text-white text-center mb-2 z-10">Total users by user_position (tags)</h3>
            <div className="w-full h-[180px] min-h-[180px]">
              <ErrorBoundary>
                {adminUsersByPositionTags.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                    <PieChart>
                      <Pie
                        data={adminUsersByPositionTags}
                        cx="50%" cy="50%"
                        innerRadius="40%" outerRadius="75%"
                        paddingAngle={0}
                        dataKey="value" stroke="none"
                        label={({ name, percent }) => `${name.substring(0,6)}.. (${(percent * 100).toFixed(0)}%)`}
                        labelLine={true}
                        labelStyle={{ fontSize: '10px' }}
                      >
                        {adminUsersByPositionTags?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} itemStyle={{ color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-white/50 text-xs">No data available</div>
                )}
              </ErrorBoundary>
            </div>
          </div>

          {/* Pie Chart 2 */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex-1 flex flex-col relative overflow-hidden">
            <h3 className="text-sm font-bold text-white text-center mb-2 z-10">Total users by user_type</h3>
            <div className="w-full h-[180px] min-h-[180px]">
              <ErrorBoundary>
                {adminUsersByType.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                    <PieChart>
                      <Pie
                        data={adminUsersByType}
                        cx="50%" cy="50%"
                        innerRadius={0} outerRadius="75%"
                        paddingAngle={0}
                        dataKey="value" stroke="none"
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                        labelLine={true}
                        labelStyle={{ fontSize: '10px' }}
                      >
                        {adminUsersByType?.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={['#14b8a6', '#8b5cf6', '#f59e0b'][index % 3]} />
                        ))}
                      </Pie>
                      <RechartsTooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} itemStyle={{ color: '#fff' }} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex items-center justify-center h-full text-white/50 text-xs">No data available</div>
                )}
              </ErrorBoundary>
            </div>
          </div>
        </div>

        {/* Right Column: Tall Bar Chart */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-full min-h-[250px]">
          <h3 className="text-sm font-bold text-white mb-6 text-center">Total users by user_position</h3>
          <div className="w-full h-[380px] lg:h-[420px] min-h-[380px]">
            <ErrorBoundary>
              {adminUsersByPosition.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                  <BarChart layout="vertical" data={adminUsersByPosition} margin={{ top: 0, right: 30, left: 120, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                    <XAxis type="number" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis dataKey="name" type="category" stroke="#fff" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" width={110} />
                    <RechartsTooltip 
                      contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
                      itemStyle={{ color: '#fff' }}
                      cursor={{fill: 'rgba(255,255,255,0.05)'}}
                    />
                    <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} barSize={25} label={{ position: 'right', fill: '#fff', fontWeight: 'bold', fontSize: 11 }}>
                      {adminUsersByPosition?.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill="#8b5cf6" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-white/50 text-xs">No data available</div>
              )}
            </ErrorBoundary>
          </div>
        </div>

      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
      {/* Toggleable Chart: Checklist by Inputs / Weekly Submissions */}
      <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-6 h-[380px] min-h-[380px] shadow-2xl shadow-black/10 flex flex-col relative">
        <div className="flex justify-between items-center mb-4">
          <div className="relative">
            <button 
              onClick={() => setIsChartDropdownOpen(!isChartDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-bg-card backdrop-blur-xl border border-glass-border rounded-xl text-[12px] font-bold text-white shadow-lg hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
            >
              {activeChart === 'checklist' ? <BarChart2 size={14} className="text-accent" /> : <LineChart size={14} className="text-accent" />}
              <span>{activeChart === 'checklist' ? 'Checklist by Inputs' : 'Work done (Weekly Submissions)'}</span>
              <ChevronDown size={14} className={`transition-transform duration-300 ${isChartDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isChartDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsChartDropdownOpen(false)}></div>
                <div className="absolute left-0 mt-2 w-64 bg-bg-card backdrop-blur-2xl border border-glass-border rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="text-[10px] font-bold text-white/40 px-2.5 py-1.5 uppercase tracking-wider border-b border-glass-border/30 mb-1">
                    Select Chart
                  </div>
                  <button
                    onClick={() => { setActiveChart('checklist'); setIsChartDropdownOpen(false); }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition-colors flex items-center gap-2 ${activeChart === 'checklist' ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
                  >
                    <BarChart2 size={14} />
                    <span>Checklist by Inputs</span>
                  </button>
                  <button
                    onClick={() => { setActiveChart('work'); setIsChartDropdownOpen(false); }}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition-colors flex items-center gap-2 ${activeChart === 'work' ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
                  >
                    <LineChart size={14} />
                    <span>Work done (Weekly Submissions)</span>
                  </button>
                </div>
              </>
            )}
          </div>
          
          {activeChart === 'checklist' && (
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
          )}
          
          {activeChart === 'work' && (
            <div className="flex items-center gap-2 animate-in fade-in">
              <div className="relative">
                <button 
                  onClick={() => setIsWeeksDropdownOpen(!isWeeksDropdownOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-bg-card backdrop-blur-xl border border-glass-border rounded-xl text-[11px] font-bold text-white shadow-lg hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
                >
                  <List size={12} className="text-accent" />
                  <span>Last {weeksLimit} Weeks</span>
                  <ChevronDown size={12} className={`transition-transform duration-300 ${isWeeksDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isWeeksDropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setIsWeeksDropdownOpen(false)}></div>
                    <div className="absolute right-0 mt-2 w-36 bg-bg-card backdrop-blur-2xl border border-glass-border rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                      <div className="text-[10px] font-bold text-white/40 px-2.5 py-1.5 uppercase tracking-wider border-b border-glass-border/30 mb-1">
                        Select Period
                      </div>
                      {[6, 12, 24, 52].map((num) => (
                        <button
                          key={num}
                          onClick={() => { setWeeksLimit(num); setIsWeeksDropdownOpen(false); }}
                          className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-colors flex items-center justify-between ${weeksLimit === num ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
                        >
                          <span>Last {num} Weeks</span>
                          {weeksLimit === num && <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
        
        <div className="w-full h-[280px] min-h-[280px]">
          <ErrorBoundary>
            {activeChart === 'work' || (!loadingChart && chartData.length > 0) ? (
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              {activeChart === 'work' ? (
                <AreaChart data={slicedPerformanceTrend}>
                  <defs>
                    <linearGradient id="colorPoints" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="week" stroke="var(--color-text-muted)" fontSize={10} tickLine={false} axisLine={false} minTickGap={30} />
                  <YAxis hide />
                  <RechartsTooltip 
                    contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                    formatter={(value) => [value, 'Submissions']}
                  />
                  <Area 
                    type="monotone" 
                    dataKey="points" 
                    stroke="#6366f1" 
                    strokeWidth={4}
                    fillOpacity={1} 
                    fill="url(#colorPoints)" 
                    dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 6, fill: '#fff', strokeWidth: 0 }}
                    label={{ position: 'top', fill: '#fff', fontSize: 12, fontWeight: 'bold', offset: 10 }}
                  />
                </AreaChart>
              ) : (
                <BarChart 
                  data={chartData} 
                  margin={{ top: 20, right: 30, left: 0, bottom: 40 }}
                >
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
                    cursor={{ fill: 'rgba(255,255,255,0.07)' }}
                    formatter={(value) => [value, 'Submissions']}
                    labelFormatter={(label) => onSelectItemName ? `${label}  —  click bar to explore ↓` : label}
                  />
                  <Bar 
                    dataKey="value" 
                    radius={[4, 4, 0, 0]} 
                    barSize={40}
                    style={{ cursor: onSelectItemName ? 'pointer' : 'default' }}
                    onClick={(data) => {
                      if (!onSelectItemName || !data?.name) return;
                      onSelectItemName(data.name);
                      if (explorerRef?.current) {
                        explorerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
                      }
                    }}
                    label={onSelectItemName && page === 1 ? {
                      position: 'top',
                      fill: '#f59e0b',
                      fontSize: 9,
                      fontWeight: 'bold',
                      formatter: (_, __, index) => index === 0 ? '↓ click' : ''
                    } : null}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={index === 0 && page === 1 ? '#f59e0b' : '#3b82f6'}
                      />
                    ))}
                  </Bar>
                </BarChart>
              )}
            </ResponsiveContainer>
            ) : loadingChart ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-text-muted">
                <Activity size={32} className="opacity-30 animate-pulse text-primary mb-2" />
                <span className="text-xs font-bold">Loading Data...</span>
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
                No data available for this range.
              </div>
            )}
          </ErrorBoundary>
        </div>
      </div>

      {/* Donut Chart Breakdown */}
      <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-6 h-[380px] min-h-[380px] shadow-2xl shadow-black/10 flex flex-col relative">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">Contribution</h3>
          <div className="flex items-center gap-2">
            {/* Top Values Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsTopLimitDropdownOpen(!isTopLimitDropdownOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-bg-card backdrop-blur-xl border border-glass-border rounded-xl text-[11px] font-bold text-white shadow-lg hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
              >
                <List size={12} className="text-accent" />
                <span>{topLimit === 'all' ? 'Show All' : `Top ${topLimit}`}</span>
                <ChevronDown size={12} className={`transition-transform duration-300 ${isTopLimitDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isTopLimitDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsTopLimitDropdownOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-32 bg-bg-card backdrop-blur-2xl border border-glass-border rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="text-[10px] font-bold text-white/40 px-2.5 py-1.5 uppercase tracking-wider border-b border-glass-border/30 mb-1">
                      Show Rows
                    </div>
                    {['all', '5', '10', '20'].map((val) => (
                      <button
                        key={val}
                        onClick={() => { setTopLimit(val); setIsTopLimitDropdownOpen(false); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-colors flex items-center justify-between ${topLimit === val ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
                      >
                        <span>{val === 'all' ? 'Show All' : `Top ${val}`}</span>
                        {topLimit === val && <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Category Filter Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                className="flex items-center gap-1.5 px-2 py-1 bg-bg-card backdrop-blur-xl border border-glass-border rounded-xl text-[10px] font-bold text-white shadow-lg hover:bg-white/10 transition-all cursor-pointer"
              >
                <span>Type: {categoryFilter === 'all' ? 'All' : categoryFilter === 'boolean' ? 'Yes/No' : 'Numeric'}</span>
                <ChevronDown size={10} className={`transition-transform duration-300 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isCategoryDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsCategoryDropdownOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-36 bg-bg-card backdrop-blur-2xl border border-glass-border rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="text-[9px] font-bold text-white/40 px-2.5 py-1.5 uppercase tracking-wider border-b border-glass-border/30 mb-1">
                      Filter by Type
                    </div>
                    {['all', 'boolean', 'numeric'].map((type) => (
                      <button
                        key={type}
                        onClick={() => { setCategoryFilter(type); setIsCategoryDropdownOpen(false); }}
                        className={`w-full text-left px-2 py-1.5 rounded-xl text-[11px] transition-colors flex items-center justify-between ${categoryFilter === type ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
                      >
                        <span>{type === 'all' ? 'All' : type === 'boolean' ? 'Yes/No Only' : 'Numeric Only'}</span>
                        {categoryFilter === type && <div className="w-1 h-1 rounded-full bg-accent"></div>}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Custom Metrics Selector Dropdown */}
            <div className="relative">
              <button 
                onClick={() => setIsBreakdownDropdownOpen(!isBreakdownDropdownOpen)}
                className="flex items-center gap-1.5 px-2 py-1 bg-bg-card backdrop-blur-xl border border-glass-border rounded-xl text-[10px] font-bold text-white shadow-lg hover:bg-white/10 transition-all cursor-pointer"
              >
                <span>Select Metrics</span>
                <ChevronDown size={10} className={`transition-transform duration-300 ${isBreakdownDropdownOpen ? 'rotate-180' : ''}`} />
              </button>
              
              {isBreakdownDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => { setIsBreakdownDropdownOpen(false); setMetricSearch(''); }}></div>
                  <div className="absolute right-0 mt-2 w-56 bg-bg-card backdrop-blur-3xl border border-glass-border rounded-2xl p-2 shadow-2xl z-50 max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="text-[10px] font-bold text-white/40 px-2.5 py-1.5 uppercase tracking-wider border-b border-glass-border/30 mb-1 sticky top-0 bg-bg-card z-20">
                      Chart Metrics
                    </div>
                    {/* Sticky Search Box */}
                    <div className="p-1 mb-1 sticky top-[28px] bg-bg-card z-20">
                      <input
                        type="text"
                        placeholder="Search metrics..."
                        value={metricSearch}
                        onChange={(e) => setMetricSearch(e.target.value)}
                        className="w-full bg-white/5 border border-glass-border rounded-xl px-2.5 py-1 text-xs text-white placeholder-white/30 focus:outline-none focus:border-accent/40"
                      />
                    </div>
                    {(data?.itemStats || [])
                      .filter(item => item.name.toLowerCase().includes(metricSearch.toLowerCase()))
                      .map((item) => {
                      const isChecked = breakdownSelectedMetrics.includes(item.name);
                      return (
                        <label
                          key={item.name}
                          className="flex items-center gap-2 px-2.5 py-1.5 hover:bg-white/5 rounded-xl cursor-pointer select-none text-[11px] text-text-muted hover:text-white transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {
                              if (isChecked) {
                                setBreakdownSelectedMetrics(prev => prev.filter(name => name !== item.name));
                              } else {
                                setBreakdownSelectedMetrics(prev => [...prev, item.name]);
                              }
                            }}
                            className="rounded-sm border-glass-border bg-bg-card text-accent focus:ring-0 focus:ring-offset-0 focus:outline-none cursor-pointer w-3.5 h-3.5"
                          />
                          <span className="truncate w-full">{item.name}</span>
                        </label>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 w-full min-h-0 flex flex-col justify-center">
          {breakdownData.length === 0 ? (
            <div className="text-center text-text-muted text-sm py-8 space-y-2">
              <Activity size={32} className="mx-auto opacity-30 animate-pulse text-primary" />
              <p>No checklist items recorded.</p>
              <p className="text-xs opacity-60">Log some activities to see your performance metrics breakdown.</p>
            </div>
          ) : (
            <div className="flex flex-row items-center justify-between gap-4 h-full min-h-0">
              {/* Left Column: Donut Chart (48% width) */}
              <div className="w-[48%] h-[200px]">
                <ErrorBoundary>
                  <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
                    <PieChart>
                      <Pie
                        data={breakdownData}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={80}
                        paddingAngle={0}
                        dataKey="value"
                        stroke="none"
                      >
                        {breakdownData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <RechartsTooltip 
                        contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }}
                        formatter={(value, name, props) => [`${value} (${props.payload.percentage}%)`, name]}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </ErrorBoundary>
              </div>

              {/* Right Column: Scrollable Legend (52% width) */}
              <div className="w-[52%] max-h-full overflow-y-auto space-y-2.5 custom-scrollbar pr-1">
                {breakdownData.map(d => (
                  <div key={d.name} className="flex items-start gap-2.5 min-w-0" title={d.name}>
                    <div className="w-2.5 h-2.5 rounded-xs shrink-0 mt-0.5" style={{ background: d.color }}></div>
                    <div className="flex flex-col min-w-0 leading-tight">
                      <span className="text-white text-[11px] font-bold truncate">{d.name}</span>
                      <span className="text-text-muted text-[10px]">{d.value} items ({d.percentage}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsightsChart;
