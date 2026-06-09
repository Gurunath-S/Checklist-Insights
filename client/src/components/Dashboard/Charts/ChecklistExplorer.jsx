import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer,
  BarChart, Bar, Cell
} from 'recharts';
import { Search, Calendar, ChevronDown, Rocket, CheckCircle2, AlertCircle, TrendingUp, BarChart3, HelpCircle, X, ShieldAlert } from 'lucide-react';
import LoadingState from '../../UI/LoadingState';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const ChecklistExplorer = ({ 
  userId, 
  organisationId, 
  department, 
  globalStartDate, 
  globalEndDate,
  selectedItemName,
  onSelectItemName
}) => {
  const [itemsList, setItemsList] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [groupBy, setGroupBy] = useState('day');
  const [chartData, setChartData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingItems, setLoadingItems] = useState(false);
  
  // Local overrides for dates, initialized with global ones if provided
  const [startDate, setStartDate] = useState(globalStartDate || '');
  const [endDate, setEndDate] = useState(globalEndDate || '');

  // For numeric inputs, toggle between viewing Average and Sum
  const [plotMetric, setPlotMetric] = useState('avg'); // 'avg' | 'sum'

  const dropdownRef = useRef(null);

  // Sync local dates with global dates if they change
  useEffect(() => {
    if (globalStartDate) setStartDate(globalStartDate);
  }, [globalStartDate]);

  useEffect(() => {
    if (globalEndDate) setEndDate(globalEndDate);
  }, [globalEndDate]);

  // Fetch checklist items on mount/filter change
  useEffect(() => {
    const fetchItems = async () => {
      setLoadingItems(true);
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${API_BASE}/insights/checklist-items/list`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setItemsList(res.data || []);
        
        // Auto-select first item if exists and nothing is selected
        if (res.data && res.data.length > 0 && !selectedItem) {
          const matchedItem = selectedItemName ? res.data.find(item => item.checklist_name === selectedItemName) : null;
          if (matchedItem) {
            setSelectedItem(matchedItem);
            setSearchTerm(matchedItem.checklist_name);
            if (matchedItem.input_type === 'Numeric') {
              setPlotMetric('sum');
            }
          } else {
            // Look for 'Approx time saved using AI' first to fulfill the specific AI use-case
            const aiItem = res.data.find(item => 
              item.checklist_name.toLowerCase().includes('ai') || 
              item.checklist_name.toLowerCase().includes('time saved')
            );
            const defaultItem = aiItem || res.data[0];
            setSelectedItem(defaultItem);
            setSearchTerm(defaultItem.checklist_name);
          }
        }
      } catch (err) {
        console.error('Failed to fetch checklist items list:', err);
      } finally {
        setLoadingItems(false);
      }
    };
    fetchItems();
  }, []);

  // Sync selected item with external prop selectedItemName
  useEffect(() => {
    if (selectedItemName && itemsList.length > 0) {
      const found = itemsList.find(item => item.checklist_name === selectedItemName);
      if (found) {
        setSelectedItem(found);
        setSearchTerm(found.checklist_name);
        if (found.input_type === 'Numeric') {
          setPlotMetric('sum');
        }
      }
    }
  }, [selectedItemName, itemsList]);

  // Fetch trend data when selected item or settings change
  useEffect(() => {
    if (!selectedItem) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem('token');
        const params = {
          itemName: selectedItem.checklist_name,
          groupBy,
        };
        if (startDate) params.startDate = startDate;
        if (endDate) params.endDate = endDate;
        if (userId) params.targetUserId = userId;
        if (organisationId) params.targetOrgId = organisationId;
        if (department) params.targetDepartment = department;

        const res = await axios.get(`${API_BASE}/insights/checklist-items/history`, {
          headers: { Authorization: `Bearer ${token}` },
          params
        });
        setChartData(res.data.chartData || []);
      } catch (err) {
        console.error('Failed to fetch item history trend:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [selectedItem, groupBy, startDate, endDate, userId, organisationId, department]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredItems = itemsList.filter(item => 
    item.checklist_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Compute aggregate statistics for KPI cards
  const totalSubmissions = chartData.reduce((acc, curr) => acc + curr.count, 0);
  
  const getKPIData = () => {
    if (!selectedItem || chartData.length === 0) return [];

    if (selectedItem.input_type === 'Numeric') {
      const totalSum = chartData.reduce((acc, curr) => acc + (curr.sum || 0), 0);
      const avgValue = totalSubmissions > 0 
        ? (chartData.reduce((acc, curr) => acc + ((curr.avg || 0) * curr.count), 0) / totalSubmissions) 
        : 0;
      const maxValue = chartData.reduce((max, curr) => Math.max(max, curr.max || 0), 0);

      const isHours = selectedItem.checklist_name.toLowerCase().includes('hour') || 
                      selectedItem.checklist_name.toLowerCase().includes('time');

      return [
        {
          label: 'Total Submissions',
          value: totalSubmissions,
          color: 'from-blue-600 to-indigo-700',
          icon: <CheckCircle2 size={20} />
        },
        {
          label: 'Average Value',
          value: `${avgValue.toFixed(2)}${isHours ? ' hrs' : ''}`,
          color: 'from-purple-500 to-fuchsia-600',
          icon: <TrendingUp size={20} />
        },
        {
          label: 'Total Accumulated',
          value: `${totalSum.toFixed(1)}${isHours ? ' hrs' : ''}`,
          color: 'from-emerald-500 to-teal-600',
          icon: <Rocket size={20} />
        },
        {
          label: 'Max Value Recorded',
          value: `${maxValue}${isHours ? ' hrs' : ''}`,
          color: 'from-amber-500 to-orange-600',
          icon: <BarChart3 size={20} />
        }
      ];
    } else {
      // Boolean type
      const totalYes = chartData.reduce((acc, curr) => acc + (curr.yesCount || 0), 0);
      const totalNo = chartData.reduce((acc, curr) => acc + (curr.noCount || 0), 0);
      const yesRate = totalSubmissions > 0 ? (totalYes / totalSubmissions) * 100 : 0;

      return [
        {
          label: 'Total Submissions',
          value: totalSubmissions,
          color: 'from-blue-600 to-indigo-700',
          icon: <CheckCircle2 size={20} />
        },
        {
          label: 'Yes / Compliance Rate',
          value: `${yesRate.toFixed(1)}%`,
          color: 'from-emerald-500 to-teal-600',
          icon: <TrendingUp size={20} />
        },
        {
          label: 'Total "Yes" Answers',
          value: totalYes,
          color: 'from-purple-500 to-fuchsia-600',
          icon: <Rocket size={20} />
        },
        {
          label: 'Total "No" Answers',
          value: totalNo,
          color: 'from-rose-500 to-pink-600',
          icon: <X size={20} />
        }
      ];
    }
  };

  const kpis = getKPIData();

  return (
    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-6 shadow-xl space-y-6">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-black uppercase tracking-widest text-white flex items-center gap-2">
            <BarChart3 className="text-primary shrink-0" size={18} />
            Checklist Item Trend Explorer
          </h3>
          <p className="text-[10px] text-text-muted mt-0.5">Search and analyze compliance rates or numerical sums for any checklist question</p>
        </div>

        {/* Grouping Selectors */}
        <div className="flex items-center gap-1.5 self-start lg:self-auto bg-white/5 border border-glass-border p-1 rounded-2xl shadow-inner">
          {[
            { label: 'Daily', val: 'day' },
            { label: 'Weekly', val: 'week' },
            { label: 'Monthly', val: 'month' }
          ].map(opt => (
            <button
              key={opt.val}
              onClick={() => setGroupBy(opt.val)}
              className={`px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                groupBy === opt.val 
                  ? 'bg-primary text-white shadow-md' 
                  : 'text-text-muted hover:text-white'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Controls: Search and Date Pickers */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        {/* Search Combo Box */}
        <div ref={dropdownRef} className="md:col-span-6 relative">
          <label className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5">Select Checklist Item</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={14} />
            <input
              type="text"
              placeholder="Search checklist items..."
              value={searchTerm}
              onFocus={() => setIsDropdownOpen(true)}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setIsDropdownOpen(true);
              }}
              className="w-full pl-10 pr-10 py-2.5 bg-white/5 border border-glass-border rounded-2xl text-xs font-semibold text-white focus:outline-none focus:border-primary/50 transition-colors"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedItem(null);
                  setIsDropdownOpen(true);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-white transition-colors cursor-pointer"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {isDropdownOpen && (
            <div className="absolute left-0 right-0 mt-2 max-h-60 overflow-y-auto bg-bg-card backdrop-blur-2xl border border-glass-border rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
              {loadingItems ? (
                <div className="p-4 text-center text-xs text-text-muted">Loading items...</div>
              ) : filteredItems.length === 0 ? (
                <div className="p-4 text-center text-xs text-text-muted">No checklist items found</div>
              ) : (
                filteredItems.map(item => (
                  <button
                    key={item.checklist_name}
                    onClick={() => {
                      setSelectedItem(item);
                      setSearchTerm(item.checklist_name);
                      setIsDropdownOpen(false);
                      onSelectItemName?.(item.checklist_name);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-colors flex items-center justify-between hover:bg-white/5 ${
                      selectedItem?.checklist_name === item.checklist_name
                        ? 'bg-primary/10 text-white font-bold'
                        : 'text-text-muted hover:text-white'
                    }`}
                  >
                    <span className="truncate mr-2">{item.checklist_name}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border shrink-0 ${
                      item.input_type === 'Boolean' 
                        ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}>
                      {item.input_type}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>

        {/* Local Date Pickers */}
        <div className="md:col-span-3">
          <label className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5">From Date</label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={14} />
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-white/5 border border-glass-border rounded-2xl text-xs font-semibold text-white focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>

        <div className="md:col-span-3">
          <label className="block text-[9px] font-bold text-text-muted uppercase tracking-widest mb-1.5">To Date</label>
          <div className="relative">
            <Calendar className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" size={14} />
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full pl-10 pr-3 py-2 bg-white/5 border border-glass-border rounded-2xl text-xs font-semibold text-white focus:outline-none focus:border-primary/50 transition-colors"
            />
          </div>
        </div>
      </div>

      {/* Selected Item Indicator */}
      {selectedItem && (
        <div className="bg-white/2 border border-glass-border/30 rounded-2xl px-4 py-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <span className="font-bold text-white uppercase tracking-wider">{selectedItem.checklist_name}</span>
            <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
              selectedItem.input_type === 'Boolean' 
                ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20' 
                : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
            }`}>
              {selectedItem.input_type} responses
            </span>
          </div>

          {selectedItem.input_type === 'Numeric' && (
            <div className="flex items-center gap-1.5 bg-white/5 border border-glass-border p-0.5 rounded-xl">
              <button
                onClick={() => setPlotMetric('avg')}
                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                  plotMetric === 'avg' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-text-muted hover:text-white'
                }`}
              >
                Avg Value
              </button>
              <button
                onClick={() => setPlotMetric('sum')}
                className={`px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-wider transition-colors cursor-pointer ${
                  plotMetric === 'sum' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-text-muted hover:text-white'
                }`}
              >
                Sum
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading state */}
      {loading ? (
        <div className="h-80 flex flex-col items-center justify-center text-text-muted">
          <LoadingState />
        </div>
      ) : !selectedItem ? (
        <div className="h-80 flex flex-col items-center justify-center text-center p-8 border border-dashed border-glass-border rounded-3xl bg-white/2 space-y-3">
          <HelpCircle size={40} className="text-text-muted/40 animate-bounce" />
          <div>
            <h4 className="text-sm font-bold text-white">No Metric Selected</h4>
            <p className="text-xs text-text-muted max-w-sm mt-1">Please search and select a checklist item to analyze its performance trends and history.</p>
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-80 flex flex-col items-center justify-center text-center p-8 border border-dashed border-glass-border rounded-3xl bg-white/2 space-y-3">
          <AlertCircle size={40} className="text-rose-500/60" />
          <div>
            <h4 className="text-sm font-bold text-white">No Submission History Found</h4>
            <p className="text-xs text-text-muted max-w-sm mt-1">
              There are no responses recorded for "{selectedItem.checklist_name}" within the selected date range.
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi, idx) => (
              <div 
                key={idx} 
                className={`bg-gradient-to-br ${kpi.color} rounded-2xl p-4 flex flex-col justify-between text-white shadow-xl hover:-translate-y-1 transition-all duration-300 min-h-[96px]`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="text-[9px] font-black uppercase tracking-wider opacity-85">{kpi.label}</span>
                  <div className="opacity-90">{kpi.icon}</div>
                </div>
                <div className="text-lg font-black mt-auto leading-none pt-2">{kpi.value}</div>
              </div>
            ))}
          </div>

          {/* Trend Chart Card */}
          <div className="h-[300px] w-full text-xs">
            <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0} debounce={100}>
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="trendColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0.45}/>
                    <stop offset="95%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0.01}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: 'var(--color-text-muted, #94a3b8)', fontSize: 10 }} 
                />
                <YAxis 
                  tickLine={false} 
                  axisLine={false} 
                  tick={{ fill: 'var(--color-text-muted, #94a3b8)', fontSize: 10 }}
                  tickFormatter={(val) => selectedItem.input_type === 'Boolean' ? `${val}%` : val}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    background: '#0a0f1d', 
                    border: '1px solid rgba(255,255,255,0.1)', 
                    borderRadius: '16px',
                    boxShadow: '0 20px 25px -5px rgba(0,0,0,0.5)'
                  }}
                  labelStyle={{ fontWeight: 'bold', color: '#fff', marginBottom: '4px' }}
                  itemStyle={{ color: 'var(--color-primary, #6366f1)', fontWeight: 'bold' }}
                />
                <Area 
                  type="monotone" 
                  dataKey={selectedItem.input_type === 'Boolean' ? 'yesPercentage' : plotMetric} 
                  name={selectedItem.input_type === 'Boolean' ? 'Yes / Compliance Rate' : (plotMetric === 'avg' ? 'Average Value' : 'Sum Total')}
                  stroke="var(--color-primary, #6366f1)" 
                  strokeWidth={3} 
                  fillOpacity={1} 
                  fill="url(#trendColor)" 
                  dot={{ r: 4, stroke: '#fff', strokeWidth: 2, fill: 'var(--color-primary, #6366f1)' }}
                  activeDot={{ r: 6, stroke: '#fff', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChecklistExplorer;
