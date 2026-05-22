import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell, PieChart, Pie
} from 'recharts';
import { Activity, ChevronDown, BarChart2, LineChart, List } from 'lucide-react';

const InsightsChart = ({ data, isAdmin, selectedMetrics = [], user, startDate, endDate }) => {
  const [activeChart, setActiveChart] = useState('checklist');
  const [isChartDropdownOpen, setIsChartDropdownOpen] = useState(false);
  const [isLimitDropdownOpen, setIsLimitDropdownOpen] = useState(false);
  
  // Pagination State
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [chartData, setChartData] = useState([]);
  const [totalPages, setTotalPages] = useState(1);
  const [loadingChart, setLoadingChart] = useState(false);

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

  if (isAdmin) {
    const COLORS = ['#6366f1', '#ec4899', '#8b5cf6', '#14b8a6', '#f59e0b', '#ef4444', '#3b82f6', '#10b981'];
    
    return (
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.5fr] gap-4 h-auto lg:h-[500px]">

        {/* Middle Column: Two Stacked Pie Charts */}
        <div className="flex flex-col gap-4 h-full min-h-[400px]">
          {/* Pie Chart 1 */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex-1 flex flex-col relative overflow-hidden">
            <h3 className="text-sm font-bold text-white text-center mb-2 z-10">Total users by user_position (tags)</h3>
            <div className="flex-1 w-full min-h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.usersByPositionTags || []}
                    cx="50%" cy="50%"
                    innerRadius="40%" outerRadius="75%"
                    paddingAngle={0}
                    dataKey="value" stroke="none"
                    label={({ name, percent }) => `${name.substring(0,6)}.. (${(percent * 100).toFixed(0)}%)`}
                    labelLine={true}
                    labelStyle={{ fontSize: '10px' }}
                  >
                    {data?.usersByPositionTags?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Pie Chart 2 */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex-1 flex flex-col relative overflow-hidden">
            <h3 className="text-sm font-bold text-white text-center mb-2 z-10">Total users by user_type</h3>
            <div className="flex-1 w-full min-h-[150px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data?.usersByType || []}
                    cx="50%" cy="50%"
                    innerRadius={0} outerRadius="75%"
                    paddingAngle={0}
                    dataKey="value" stroke="none"
                    label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                    labelLine={true}
                    labelStyle={{ fontSize: '10px' }}
                  >
                    {data?.usersByType?.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#14b8a6', '#8b5cf6', '#f59e0b'][index % 3]} />
                    ))}
                  </Pie>
                  <RechartsTooltip contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px' }} itemStyle={{ color: '#fff' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right Column: Tall Bar Chart */}
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col h-full min-h-[250px]">
          <h3 className="text-sm font-bold text-white mb-6 text-center">Total users by user_position</h3>
          <div className="flex-1 w-full min-h-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart layout="vertical" data={data?.usersByPosition || []} margin={{ top: 0, right: 30, left: 120, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" horizontal={false} />
                <XAxis type="number" stroke="var(--color-text-muted)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis dataKey="name" type="category" stroke="#fff" fontSize={10} tickLine={false} axisLine={false} fontWeight="bold" width={110} />
                <RechartsTooltip 
                  contentStyle={{ background: '#0f172a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)' }}
                  itemStyle={{ color: '#fff' }}
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 8, 8, 0]} barSize={25} label={{ position: 'right', fill: '#fff', fontWeight: 'bold', fontSize: 11 }}>
                   {data?.usersByPosition?.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill="#8b5cf6" />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    );
  }

  // Generate dynamic Contribution Breakdown data from user's selected metrics
  const selectedMetricsData = data?.itemStats?.filter(item => selectedMetrics.includes(item.name)) || [];
  const totalValue = selectedMetricsData.reduce((acc, curr) => acc + curr.value, 0);

  const colors = [
    '#10b981', // Emerald
    '#8b5cf6', // Purple
    '#f59e0b', // Amber
    '#f43f5e', // Rose
    '#06b6d4', // Cyan
    '#d946ef', // Fuchsia
    '#0ea5e9', // Sky Blue
    '#14b8a6', // Teal
    '#6366f1', // Indigo
    '#f97316', // Orange
    '#84cc16', // Lime
    '#ec4899'  // Pink
  ];

  const breakdownData = selectedMetricsData.map((item, index) => {
    const percentage = totalValue > 0 ? Math.round((item.value / totalValue) * 100) : 0;
    return {
      name: item.name,
      value: item.value,
      percentage: percentage,
      color: colors[index % colors.length]
    };
  });

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
        </div>
        
        <div className="flex-1 w-full min-h-0">
          <ResponsiveContainer width="100%" height="100%">
            {activeChart === 'work' ? (
              <AreaChart data={data?.performanceTrend || [
                { week: 'Nov 2025', points: 4 },
                { week: 'Dec 2025', points: 12 },
                { week: 'Jan 2026', points: 8 },
                { week: 'Feb 2026', points: 5 },
                { week: 'Mar 2026', points: 11 },
                { week: 'Apr 2026', points: 3 },
              ]}>
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
            ) : loadingChart ? (
              <div className="w-full h-full flex flex-col items-center justify-center text-text-muted">
                <Activity size={32} className="opacity-30 animate-pulse text-primary mb-2" />
                <span className="text-xs font-bold">Loading Data...</span>
              </div>
            ) : chartData.length === 0 ? (
              <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">
                No data available for this range.
              </div>
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
                  cursor={{fill: 'rgba(255,255,255,0.05)'}}
                />
                <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 && page === 1 ? '#f59e0b' : '#3b82f6'} />
                  ))}
                </Bar>
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      </div>

      {/* Donut Chart Breakdown */}
      <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-6 h-[380px] min-h-[380px] shadow-2xl shadow-black/10 flex flex-col">
        <h3 className="text-lg font-bold text-white mb-2">Contribution Breakdown</h3>
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
              <div className="w-[48%] h-full min-h-0">
                <ResponsiveContainer width="100%" height="100%">
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
