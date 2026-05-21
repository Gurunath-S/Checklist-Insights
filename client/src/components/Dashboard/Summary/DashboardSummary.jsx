import React, { useState, useEffect } from 'react';
import { Users, FileText, Layout, Send, CheckCircle, Rocket, Tag, Grid2x2, SlidersHorizontal, ChevronDown, Activity, CheckSquare, Bug, Clock, Search } from 'lucide-react';

const getMetricIcon = (name) => {
  const lowercase = name.toLowerCase();
  if (lowercase.includes('bug') || lowercase.includes('error')) return <Bug />;
  if (lowercase.includes('time') || lowercase.includes('hour') || lowercase.includes('clock') || lowercase.includes('duration')) return <Clock />;
  if (lowercase.includes('complete') || lowercase.includes('done') || lowercase.includes('finish')) return <CheckSquare />;
  if (lowercase.includes('work') || lowercase.includes('task') || lowercase.includes('develop')) return <CheckCircle />;
  if (lowercase.includes('ai') || lowercase.includes('gpt') || lowercase.includes('copilot') || lowercase.includes('bot')) return <Rocket />;
  return <Activity />;
};

const formatDateDMY = (dateStr) => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    const [year, month, day] = parts;
    return `${day}/${month}/${year}`;
  }
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

const DashboardSummary = ({ 
  data, 
  isAdmin, 
  hideKPIs = false,
  selectedDepartment = '',
  selectedMetrics = [],
  setSelectedMetrics,
  datePreset,
  startDate,
  endDate,
  handlePresetChange,
  setStartDate,
  setEndDate
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [tempStartText, setTempStartText] = useState('');
  const [tempEndText, setTempEndText] = useState('');

  useEffect(() => {
    setTempStartText(formatDateDMY(startDate));
  }, [startDate]);

  useEffect(() => {
    setTempEndText(formatDateDMY(endDate));
  }, [endDate]);

  const presets = [
    { value: 'all-time', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this-week', label: 'This Week' },
    { value: 'last-week', label: 'Last Week' },
    { value: 'this-month', label: 'This Month' },
    { value: 'last-month', label: 'Last Month' },
    { value: 'this-year', label: 'This Year' },
    { value: 'last-year', label: 'Last Year' },
    { value: 'custom', label: 'Custom Range' }
  ];

  const handleTextDateChange = (val, prevVal, textSetter, dateSetter) => {
    let cleaned = val.replace(/[^0-9/]/g, '');
    cleaned = cleaned.replace(/\/+/g, '/');

    const isDeleting = val.length < prevVal.length;

    if (!isDeleting) {
      if (cleaned.length === 2 && !cleaned.includes('/')) {
        cleaned = cleaned + '/';
      } else if (cleaned.length === 5 && cleaned.split('/').length === 2) {
        cleaned = cleaned + '/';
      }
    }

    if (cleaned.length > 10) {
      cleaned = cleaned.substring(0, 10);
    }

    textSetter(cleaned);

    if (cleaned.length === 10) {
      const parts = cleaned.split('/');
      if (parts.length === 3) {
        const [day, month, year] = parts;
        const d = parseInt(day, 10);
        const m = parseInt(month, 10);
        const y = parseInt(year, 10);
        
        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900 && y <= 2100) {
          const ymd = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
          dateSetter(ymd);
        }
      }
    }
  };

  const renderDateFilter = () => (
    <div className="relative">
      <button 
        onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-bg-card backdrop-blur-xl border border-glass-border rounded-xl text-[11px] font-semibold text-white shadow-lg hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
      >
        <Clock size={13} className="text-accent" />
        <span>
          {datePreset === 'custom' 
            ? (startDate && endDate ? `${formatDateDMY(startDate)} - ${formatDateDMY(endDate)}` : 'Custom Range')
            : presets.find(p => p.value === datePreset)?.label || 'All Time'}
        </span>
        <ChevronDown size={12} className={`transition-transform duration-300 ${isDateDropdownOpen ? 'rotate-180' : ''}`} />
      </button>

      {isDateDropdownOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsDateDropdownOpen(false)}></div>
          
          <div className="absolute right-0 mt-2 w-56 bg-bg-card backdrop-blur-2xl border border-glass-border rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="text-[10px] font-bold text-white/40 px-2.5 py-1.5 uppercase tracking-wider border-b border-glass-border/30 mb-1">
              Select Period
            </div>
            <div className="max-h-64 overflow-y-auto space-y-0.5 custom-scrollbar pr-1">
              {presets.map((preset) => (
                <button
                  key={preset.value}
                  onClick={() => {
                    handlePresetChange(preset.value);
                    if (preset.value !== 'custom') {
                      setIsDateDropdownOpen(false);
                    }
                  }}
                  className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-colors flex items-center justify-between ${datePreset === preset.value ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
                >
                  <span>{preset.label}</span>
                  {datePreset === preset.value && <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>}
                </button>
              ))}
            </div>
            
            {datePreset === 'custom' && (
              <div className="mt-2 pt-2 border-t border-glass-border/30 px-2 pb-1 space-y-2 animate-in fade-in duration-200">
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-text-muted uppercase">Start Date</span>
                  <input 
                    type="text" 
                    placeholder="dd/mm/yyyy"
                    value={tempStartText}
                    onChange={(e) => handleTextDateChange(e.target.value, tempStartText, setTempStartText, setStartDate)}
                    className="w-full bg-white/5 border border-glass-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="text-[9px] font-bold text-text-muted uppercase">End Date</span>
                  <input 
                    type="text" 
                    placeholder="dd/mm/yyyy"
                    value={tempEndText}
                    onChange={(e) => handleTextDateChange(e.target.value, tempEndText, setTempEndText, setEndDate)}
                    className="w-full bg-white/5 border border-glass-border rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none focus:ring-1 focus:ring-accent"
                  />
                </div>
                <button 
                  onClick={() => setIsDateDropdownOpen(false)}
                  className="w-full py-1.5 text-[10px] font-bold uppercase tracking-wider text-accent bg-accent/10 border border-accent/20 rounded-xl hover:bg-accent/20 transition-all cursor-pointer text-center mt-1"
                >
                  Apply Range
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );

  if (isAdmin) {
    return (
      <div className="space-y-4 mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
          <div>
            <h2 className="text-sm font-bold tracking-widest text-text-muted uppercase">
              {hideKPIs ? `${selectedDepartment?.replace(/_/g, ' ')} Department` : 'Admin Overview'}
            </h2>
          </div>
          {renderDateFilter()}
        </div>

        {!hideKPIs && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <AdminKPICard icon={<Users />} label="Users" value={data?.totalUsers} />
            <AdminKPICard icon={<Tag />} label="Tags" value={data?.totalTags} />
            <AdminKPICard icon={<Layout />} label="Templates" value={data?.totalTemplates} />
            <AdminKPICard icon={<Grid2x2 />} label="Items" value={data?.totalItems} />
          </div>
        )}
      </div>
    );
  }

  const summary = data?.summary || {};
  const itemStats = data?.itemStats || [];

  const handleToggleMetric = (metricName) => {
    if (selectedMetrics.includes(metricName)) {
      if (selectedMetrics.length > 1) {
        setSelectedMetrics(selectedMetrics.filter(name => name !== metricName));
      }
    } else {
      setSelectedMetrics([...selectedMetrics, metricName]);
    }
  };

  const displayedMetrics = itemStats.filter(item => selectedMetrics.includes(item.name));

  return (
    <div className="flex flex-col gap-4 mb-8">
      {/* Header with customization controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 px-1">
        <h2 className="text-sm font-bold tracking-widest text-text-muted uppercase">Key Indicators</h2>
        <div className="flex items-center gap-3">
          {renderDateFilter()}
          <div className="relative">
            <button 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-bg-card backdrop-blur-xl border border-glass-border rounded-xl text-[11px] font-semibold text-white shadow-lg hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
            >
              <SlidersHorizontal size={14} className="text-accent" />
              Customize Metrics
              <ChevronDown size={12} className={`transition-transform duration-300 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {isDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsDropdownOpen(false)}></div>
                
                <div className="absolute right-0 mt-2 w-64 bg-bg-card backdrop-blur-2xl border border-glass-border rounded-2xl p-4 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="text-xs font-bold text-white mb-2 uppercase tracking-wide border-b border-glass-border pb-2 flex justify-between items-center">
                    <span>Select metrics to display</span>
                    <span className="text-[10px] text-accent bg-accent/15 px-1.5 py-0.5 rounded-full">{selectedMetrics.length} Selected</span>
                  </div>
                  {/* Search Bar */}
                  <div className="relative my-2">
                    <input 
                      type="text" 
                      placeholder="Search metrics..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-white/5 border border-glass-border rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-text-muted focus:outline-none focus:ring-1 focus:ring-accent"
                    />
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-text-muted" size={12} />
                  </div>
                  <div className="max-h-48 overflow-y-auto space-y-1 custom-scrollbar pr-1">
                    {itemStats.length === 0 ? (
                      <div className="text-xs text-text-muted text-center py-4">No checklist metrics found.</div>
                    ) : (() => {
                      const filtered = itemStats.filter(item => 
                        item.name.toLowerCase().includes(searchQuery.toLowerCase())
                      );
                      if (filtered.length === 0) {
                        return <div className="text-xs text-text-muted text-center py-4">No matching metrics found.</div>;
                      }
                      return filtered.map((item) => {
                        const isChecked = selectedMetrics.includes(item.name);
                        return (
                          <label 
                            key={item.name}
                            className={`flex items-start gap-2.5 p-2 rounded-xl text-xs cursor-pointer transition-colors ${isChecked ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
                          >
                            <input 
                              type="checkbox" 
                              checked={isChecked}
                              onChange={() => handleToggleMetric(item.name)}
                              className="mt-0.5 rounded border-glass-border text-primary focus:ring-primary bg-white/10 cursor-pointer"
                            />
                            <span className="break-all">{item.name}</span>
                          </label>
                        );
                      });
                    })()}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4">
          <ColorfulCard color="from-indigo-600 to-indigo-800" icon={<Send />} label="Submissions" value={summary.totalSubmissions || 0} />
          
          {displayedMetrics.map((metric, idx) => {
            const cardColors = [
              'from-emerald-500 to-emerald-700',
              'from-purple-500 to-purple-700',
              'from-amber-500 to-amber-700',
              'from-rose-500 to-rose-700',
              'from-cyan-500 to-cyan-700',
              'from-fuchsia-500 to-fuchsia-700',
              'from-sky-500 to-sky-700',
              'from-teal-500 to-teal-700',
              'from-indigo-500 to-indigo-700',
              'from-orange-500 to-orange-700',
              'from-lime-500 to-lime-700',
              'from-pink-500 to-pink-700'
            ];
            return (
              <ColorfulCard 
                key={metric.name}
                color={cardColors[idx % cardColors.length]} 
                icon={getMetricIcon(metric.name)} 
                label={metric.name} 
                value={metric.value} 
              />
            );
          })}

          <div 
            className="bg-white/5 border border-glass-border border-dashed rounded-2xl p-4 flex flex-col items-center justify-center gap-1 text-text-muted hover:bg-white/10 hover:border-accent/40 hover:text-white transition-all cursor-pointer aspect-square lg:aspect-auto min-h-[90px]"
            onClick={() => setIsDropdownOpen(true)}
          >
            <Activity size={24} className="opacity-40 animate-pulse" />
            <span className="text-[10px] font-bold uppercase tracking-wider text-center">Add Metric</span>
          </div>
        </div>
        
        <div className={`rounded-2xl p-4 text-center flex flex-col justify-center border-2 shadow-xl shadow-black/20 transition-all duration-500 ${
          summary.todaySubmitted 
            ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-500' 
            : 'bg-amber-500/10 border-amber-500/50 text-amber-500 animate-pulse'
        }`}>
          <h4 className="text-[0.7rem] font-black uppercase tracking-widest mb-1 opacity-80">Today's Status</h4>
          <span className="text-lg font-black italic uppercase">
            {summary.todaySubmitted ? 'Entered' : 'Pending'}
          </span>
          <div className={`w-2 h-2 rounded-full mx-auto mt-2 ${summary.todaySubmitted ? 'bg-emerald-500' : 'bg-amber-500'}`}></div>
        </div>
      </div>
    </div>
  );
};

const ColorfulCard = ({ color, icon, label, value }) => (
  <div className={`bg-linear-to-br ${color} rounded-2xl p-4 flex flex-col items-center justify-center gap-2 text-white shadow-xl shadow-black/20 hover:-translate-y-2 hover:scale-105 transition-all duration-300 cursor-default aspect-square lg:aspect-auto`}>
    {React.cloneElement(icon, { size: 24, className: "opacity-90" })}
    <span className="text-[0.7rem] font-bold uppercase tracking-wide opacity-80 text-center truncate w-full" title={label}>{label}</span>
    <span className="text-xl font-extrabold">{value}</span>
  </div>
);

const AdminKPICard = ({ icon, label, value }) => (
  <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex items-center justify-between gap-4">
    <div className="flex flex-col">
      <span className="text-text-muted text-xs font-bold uppercase tracking-widest mb-1">{label}</span>
      <h3 className="text-2xl font-black text-white leading-none">{value || 0}</h3>
    </div>
    <div className="text-primary opacity-80 p-2 bg-white/5 rounded-2xl border border-white/10">
      {React.cloneElement(icon, { size: 24, strokeWidth: 1.5 })}
    </div>
  </div>
);

export default DashboardSummary;
