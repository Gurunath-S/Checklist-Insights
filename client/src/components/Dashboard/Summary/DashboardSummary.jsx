import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Users, FileText, Layout, Send, CheckCircle, Rocket, Tag, Grid2x2, SlidersHorizontal, ChevronDown, Activity, CheckSquare, Bug, Clock, Search, X } from 'lucide-react';

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
  setEndDate,
  onSelectOrganisation
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // ─── Guard: ensure selectedMetrics is always a plain array ───────────────
  // Declared here (before any hooks) so useCallback closures can safely reference it.
  const safeMetrics = Array.isArray(selectedMetrics) ? selectedMetrics : [];

  // ─── Drag state: use metric NAME not index ──────────────────────────────────────
  // Index-based drag breaks when metricsToRender is a filtered subset of
  // safeMetrics (zero-value cards are skipped), making splice() cut wrong items.
  const [draggingName, setDraggingName] = useState(null);
  const [dropTargetName, setDropTargetName] = useState(null);
  const dragNameRef = useRef(null);

  const [tempStartText, setTempStartText] = useState('');
  const [tempEndText, setTempEndText] = useState('');

  // ─── Drag-and-Drop Handlers ───────────────────────────────────────────────
  const handleDragStart = useCallback((e, name) => {
    dragNameRef.current = name;
    e.dataTransfer.effectAllowed = 'move';
    // RAF ensures browser captures ghost image before opacity dims
    requestAnimationFrame(() => setDraggingName(name));
  }, []);

  const handleDragOver = useCallback((e, name) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragNameRef.current !== name) {
      setDropTargetName(name);
    }
  }, []);

  const handleDrop = useCallback((e, targetName) => {
    e.preventDefault();
    const dragName = dragNameRef.current;

    // Reset all visual state immediately
    setDraggingName(null);
    setDropTargetName(null);
    dragNameRef.current = null;

    if (!dragName || dragName === targetName) return;

    // IMPORTANT: setSelectedMetrics is a plain Zustand setter — NOT React setState.
    // Passing a (prev => ...) function would store the function itself as state.
    // Use safeMetrics directly, which is already validated as an array in this render.
    const fromIdx = safeMetrics.indexOf(dragName);
    const toIdx   = safeMetrics.indexOf(targetName);
    if (fromIdx === -1 || toIdx === -1) return;

    const reordered = [...safeMetrics];
    const [moved] = reordered.splice(fromIdx, 1);
    reordered.splice(toIdx, 0, moved);
    setSelectedMetrics(reordered);
  }, [setSelectedMetrics, safeMetrics]);

  const handleDragEnd = useCallback(() => {
    setDraggingName(null);
    setDropTargetName(null);
    dragNameRef.current = null;
  }, []);

  const handleDragLeave = useCallback((e) => {
    // Ignore leaves triggered by entering a child element
    if (!e.currentTarget.contains(e.relatedTarget)) {
      setDropTargetName(null);
    }
  }, []);

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

        {!hideKPIs && data?.organisations && (
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-5 shadow-xl space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-black uppercase tracking-widest text-white">Domain Analytics</h3>
                <p className="text-[9px] text-text-muted mt-0.5">Performance metrics segmented by domain / organization</p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-glass-border bg-white/5 text-[9px] font-black uppercase tracking-widest text-text-muted">
                    <th className="px-6 py-4">Domain / Organisation</th>
                    <th className="px-6 py-4 text-center">Active Users</th>
                    <th className="px-6 py-4 text-center">Total Submissions</th>
                    <th className="px-6 py-4">Compliance Score</th>
                    <th className="px-6 py-4 text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border/30">
                  {data.organisations.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="px-6 py-8 text-center text-text-muted font-bold text-xs">
                        No organizations/domains found.
                      </td>
                    </tr>
                  ) : (
                    data.organisations.map((org) => (
                      <tr key={org.id} className="hover:bg-white/2 transition-colors">
                        <td className="px-6 py-4 text-xs font-bold text-white uppercase tracking-wider">
                          {org.organisation}
                        </td>
                        <td className="px-6 py-4 text-xs text-white text-center">
                          {org.total_users}
                        </td>
                        <td className="px-6 py-4 text-xs text-white text-center">
                          {org.total_submissions}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex flex-col gap-1 w-32">
                            <span className="text-[10px] font-bold text-white">{org.avg_completion_rate}%</span>
                            <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-accent rounded-full" 
                                style={{ width: `${org.avg_completion_rate}%` }} 
                              />
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <button
                            type="button"
                            onClick={() => onSelectOrganisation && onSelectOrganisation(org)}
                            className="px-3 py-1.5 bg-accent/10 hover:bg-accent/20 border border-accent/30 text-accent font-black rounded-xl text-[10px] uppercase tracking-wider transition-all cursor-pointer"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    );
  }

  const summary = data?.summary || {};
  const itemStats = data?.itemStats || [];

  const handleToggleMetric = (metricName) => {
    if (safeMetrics.includes(metricName)) {
      if (safeMetrics.length > 1) {
        setSelectedMetrics(safeMetrics.filter((name) => name !== metricName));
      }
    } else {
      setSelectedMetrics([...safeMetrics, metricName]);
    }
  };

  // ─── Derive displayedMetrics in safeMetrics order (fixes drag reorder rendering) ─
  const displayedMetrics = safeMetrics
    .map((name) => itemStats.find((item) => item.name === name))
    .filter(Boolean);

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
                    <span className="text-[10px] text-accent bg-accent/15 px-1.5 py-0.5 rounded-full">{safeMetrics.length} Selected</span>
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
                        const isChecked = safeMetrics.includes(item.name);
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
          
          {(() => {
            // Find Daily Clock In and Daily Clock Out metrics
            const clockInMetric = displayedMetrics.find(m => m.name.toLowerCase() === 'daily clock in' || m.name.toLowerCase() === 'clock in');
            const clockOutMetric = displayedMetrics.find(m => m.name.toLowerCase() === 'daily clock out' || m.name.toLowerCase() === 'clock out');

            // Render combined attendance card if both are present and at least one is non-zero
            const showCombinedAttendance = clockInMetric && clockOutMetric && (Number(clockInMetric.value) > 0 || Number(clockOutMetric.value) > 0);

            // Filter out combined items from displayed list
            const metricsToRender = displayedMetrics.filter(m => {
              if (Number(m.value) === 0) return false;
              if (showCombinedAttendance) {
                return m.name !== clockInMetric.name && m.name !== clockOutMetric.name;
              }
              return true;
            });

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

                {metricsToRender.map((metric, idx) => {
                  const CARD_COLORS = [
                    'from-purple-500 to-purple-700',
                    'from-amber-500 to-amber-700',
                    'from-rose-500 to-rose-700',
                    'from-fuchsia-500 to-fuchsia-700',
                    'from-orange-500 to-orange-700',
                    'from-pink-500 to-pink-700',
                    'from-emerald-500 to-emerald-700',
                    'from-teal-500 to-teal-700',
                  ];

                  // Name-based comparison — immune to filtered index gaps
                  const isBeingDragged = draggingName === metric.name;
                  const isDragTarget   = dropTargetName === metric.name;

                  let displayValue = metric.value;
                  if (metric.isPercentage || metric.type === 'Boolean') {
                    displayValue = `${metric.value}%`;
                  } else if (
                    metric.isTimeAverage ||
                    ['time', 'hour', 'duration', 'clock', 'minutes'].some((k) =>
                      metric.name.toLowerCase().includes(k)
                    )
                  ) {
                    displayValue = `${metric.value} hrs`;
                  } else if (
                    metric.isTaskAverage ||
                    ['tasks worked', 'task worked'].some((k) =>
                      metric.name.toLowerCase().includes(k)
                    )
                  ) {
                    displayValue = `${metric.value} tasks/day`;
                  }

                  return (
                    <div
                      key={metric.name}
                      className="relative group"
                      draggable
                      onDragStart={(e) => handleDragStart(e, metric.name)}
                      onDragOver={(e)  => handleDragOver(e, metric.name)}
                      onDrop={(e)      => handleDrop(e, metric.name)}
                      onDragEnd={handleDragEnd}
                      onDragLeave={handleDragLeave}
                      title="Drag to reorder"
                      style={{
                        cursor: 'grab',
                        opacity: isBeingDragged ? 0.4 : 1,
                        outline: isDragTarget ? '2px solid var(--color-accent, #6366f1)' : 'none',
                        outlineOffset: '3px',
                        borderRadius: '1rem',
                        transition: 'opacity 150ms ease, outline 150ms ease, transform 150ms ease',
                        transform: isDragTarget ? 'scale(1.03)' : 'scale(1)',
                      }}
                    >
                      {/* ── X dismiss button: visible on card hover ── */}
                      <button
                        onClick={() => handleToggleMetric(metric.name)}
                        title={`Remove "${metric.name}"`}
                        className="absolute top-1.5 right-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150 bg-black/50 hover:bg-red-500 rounded-full p-0.5 text-white cursor-pointer"
                      >
                        <X size={10} strokeWidth={2.5} />
                      </button>

                      <ColorfulCard
                        color={CARD_COLORS[idx % CARD_COLORS.length]}
                        icon={getMetricIcon(metric.name)}
                        label={metric.name}
                        value={displayValue}
                      />
                    </div>
                  );
                })}
              </>
            );
          })()}

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
          {summary.todaySubmitted && (
            <span className="text-[10px] font-bold uppercase tracking-wider mt-1 opacity-80">
              {summary.todaySubmittedCount || 0} {summary.todaySubmittedCount === 1 ? 'checklist' : 'checklists'}
            </span>
          )}
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

const DoubleMetricCard = ({ color, icon, label, val1Label, val1, val2Label, val2 }) => (
  <div className={`bg-linear-to-br ${color} rounded-2xl p-4 flex flex-col justify-between text-white shadow-xl shadow-black/20 hover:-translate-y-2 hover:scale-105 transition-all duration-300 cursor-default aspect-square lg:aspect-auto`}>
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
