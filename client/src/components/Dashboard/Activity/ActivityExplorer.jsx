import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  ClipboardList, ChevronRight, ChevronLeft, ChevronDown,
  Calendar, CheckCircle2, Circle, MessageSquare,
  Hash, ToggleLeft, Loader2, FileText, CalendarClock, List
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const fmt = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const fmtShort = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

// ─── Skeleton Loader ──────────────────────────────────────────────────────────
const Skeleton = ({ className = '' }) => (
  <div className={`animate-pulse bg-white/5 rounded-xl ${className}`} />
);

// ─── Pagination Controls ──────────────────────────────────────────────────────
const PaginationControls = ({ page, setPage, totalPages, limit, setLimit, isOpen, setIsOpen }) => (
  <div className="flex items-center justify-end gap-2 mt-4 animate-[fadeIn_0.3s_ease]">
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-glass-border rounded-xl text-[11px] font-bold text-white shadow-lg hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
      >
        <List size={12} className="text-accent" />
        <span>Show {limit}</span>
        <ChevronDown size={12} className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)}></div>
          <div className="absolute right-0 bottom-full mb-2 w-32 bg-bg-card backdrop-blur-2xl border border-glass-border rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2 duration-200">
            <div className="text-[10px] font-bold text-white/40 px-2.5 py-1.5 uppercase tracking-wider border-b border-glass-border/30 mb-1">
              Show Rows
            </div>
            {[5, 10, 20, 50].map((val) => (
              <button
                key={val}
                onClick={() => { setLimit(val); setPage(1); setIsOpen(false); }}
                className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs transition-colors flex items-center justify-between ${limit === val ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
              >
                <span>Show {val}</span>
                {limit === val && <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
    
    <div className="flex items-center gap-1 bg-white/5 border border-glass-border rounded-xl px-1 py-1 shadow-lg">
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
);

// ─── Level 1: Template Cards ──────────────────────────────────────────────────
const TemplateList = ({ userId, onSelect, startDate, endDate }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    axios.get(`${API_BASE}/activity/templates/${userId}`, {
      params,
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => {
        setTemplates(r.data.data || []);
        setTotalPages(r.data.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, page, limit, startDate, endDate]);

  if (loading) return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-28" />)}
    </div>
  );

  if (!templates.length) return (
    <div className="flex flex-col items-center justify-center py-20 text-text-muted">
      <FileText size={40} className="mb-4 opacity-40" />
      <p className="font-semibold">No submissions found</p>
    </div>
  );

  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {templates.map(t => (
          <button
            key={t.template_id}
            onClick={() => onSelect(t)}
            className="group w-full text-left bg-white/5 hover:bg-primary/10 border border-glass-border hover:border-primary/40 rounded-xl p-4 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 cursor-pointer"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-primary/15 border border-primary/25 flex items-center justify-center text-primary shrink-0">
                  <ClipboardList size={16} />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-white truncate leading-tight">
                    {t.template_name}
                  </p>
                  <p className="text-xs text-text-muted mt-1">
                    Last submitted: <span className="text-accent font-semibold">{fmt(t.last_submitted)}</span>
                  </p>
                </div>
              </div>
              <ChevronRight size={16} className="text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-0.5" />
            </div>
            <div className="mt-3 flex items-center gap-2">
              <span className="text-[0.6rem] uppercase tracking-widest font-bold text-text-muted bg-white/5 px-2 py-0.5 rounded-full border border-glass-border">
                {t.total_responses} responses
              </span>
            </div>
          </button>
        ))}
      </div>
      {templates.length > 0 && (
        <PaginationControls 
          page={page} setPage={setPage} totalPages={totalPages} 
          limit={limit} setLimit={setLimit} isOpen={isDropdownOpen} setIsOpen={setIsDropdownOpen} 
        />
      )}
    </div>
  );
};

// ─── Level 2: Date Rows ───────────────────────────────────────────────────────
const DateList = ({ userId, template, onSelect, startDate, endDate }) => {
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  useEffect(() => {
    setLoading(true);
    const params = { page, limit };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    axios.get(`${API_BASE}/activity/dates/${userId}/${template.template_id}`, {
      params,
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    })
      .then(r => {
        setDates(r.data.data || []);
        setTotalPages(r.data.totalPages || 1);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, template.template_id, page, limit, startDate, endDate]);

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3,4,5].map(i => <Skeleton key={i} className="h-16" />)}
    </div>
  );

  if (!dates.length) return (
    <div className="flex flex-col items-center justify-center py-20 text-text-muted">
      <Calendar size={40} className="mb-4 opacity-40" />
      <p className="font-semibold">No submission dates found</p>
    </div>
  );

  return (
    <div>
      <div className="space-y-2">
        {dates.map((d, i) => {
          const submittedStr = fmt(d.submitted_day);
          const selectedStr = fmt(d.selected_date);
          const isBackdated = d.is_backdated;
          const completionPct = d.items_count > 0
            ? Math.round((d.completed_count / d.items_count) * 100)
            : 0;

          return (
            <button
              key={i}
              onClick={() => onSelect(d)}
              className="group w-full text-left bg-white/5 hover:bg-primary/10 border border-glass-border hover:border-primary/40 rounded-xl px-4 py-2.5 flex items-center gap-3 transition-all duration-200 hover:-translate-x-1 cursor-pointer"
            >
              {/* Date icon */}
              <div className="w-8 h-8 rounded-lg bg-white/5 border border-glass-border flex items-center justify-center text-text-muted group-hover:text-primary shrink-0 transition-colors">
                {isBackdated ? <CalendarClock size={15} /> : <Calendar size={15} />}
              </div>

              {/* Date info */}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-white">
                  {submittedStr}
                </p>
                {isBackdated && (
                  <p className="text-[0.7rem] text-amber-400 font-medium mt-0.5 flex items-center gap-1">
                    <CalendarClock size={11} />
                    For: {selectedStr}
                  </p>
                )}
              </div>

              {/* Completion badge */}
              <div className="flex flex-col items-end gap-1 shrink-0">
                <span className="text-[0.7rem] font-bold text-white">
                  {d.completed_count}/{d.items_count} done
                </span>
                <div className="w-20 h-1 bg-white/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full transition-all duration-500"
                    style={{ width: `${completionPct}%` }}
                  />
                </div>
              </div>

              <ChevronRight size={14} className="text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
            </button>
          );
        })}
      </div>
      {dates.length > 0 && (
        <PaginationControls 
          page={page} setPage={setPage} totalPages={totalPages} 
          limit={limit} setLimit={setLimit} isOpen={isDropdownOpen} setIsOpen={setIsDropdownOpen} 
        />
      )}
    </div>
  );
};

// ─── Level 3: Item Responses ──────────────────────────────────────────────────
const ResponseDetail = ({ userId, template, dateRow }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const dateParam = dateRow.submitted_day instanceof Date
    ? dateRow.submitted_day.toISOString().slice(0, 10)
    : String(dateRow.submitted_day).slice(0, 10);

  useEffect(() => {
    axios.get(`${API_BASE}/activity/responses/${userId}/${template.template_id}/${dateParam}`)
      .then(r => setItems(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, template.template_id, dateParam]);

  if (loading) return (
    <div className="space-y-3">
      {[1,2,3,4].map(i => <Skeleton key={i} className="h-20" />)}
    </div>
  );

  if (!items.length) return (
    <div className="flex flex-col items-center justify-center py-20 text-text-muted">
      <ClipboardList size={40} className="mb-4 opacity-40" />
      <p className="font-semibold">No items found for this date</p>
    </div>
  );

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const isNumeric = item.input_type === 'Numeric';
        const isDone = item.status;
        const hasComment = item.comments && item.comments.trim().length > 0;

        return (
          <div
            key={i}
            className="bg-white/5 border border-glass-border rounded-xl px-4 py-2.5"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left: icon + name */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`w-7 h-7 rounded-md flex items-center justify-center shrink-0 mt-0.5 ${isDone ? 'bg-success/15 text-success border border-success/25' : 'bg-white/5 text-text-muted border border-glass-border'}`}>
                  {isNumeric ? <Hash size={13} /> : <ToggleLeft size={13} />}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-white leading-snug">
                    {item.checklist_name}
                  </p>
                  {hasComment && (
                    <p className="text-[0.7rem] text-text-muted mt-1 flex items-start gap-1">
                      <MessageSquare size={10} className="shrink-0 mt-0.5 text-accent" />
                      <span className="italic leading-relaxed">{item.comments}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Right: value chip + status */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                {/* Value */}
                {isNumeric ? (
                  <span className="text-sm font-bold text-accent leading-none">
                    {item.input ?? '—'}
                  </span>
                ) : (
                  <span className={`flex items-center gap-1 text-xs font-bold ${isDone ? 'text-success' : 'text-text-muted'}`}>
                    {isDone
                      ? <><CheckCircle2 size={14} /> Done</>
                      : <><Circle size={14} /> Pending</>
                    }
                  </span>
                )}
                {/* Type label */}
                <span className="text-[0.55rem] uppercase tracking-widest font-bold text-text-muted">
                  {isNumeric ? 'numeric' : 'boolean'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ─── Root Explorer ────────────────────────────────────────────────────────────
const ActivityExplorer = ({ user }) => {
  const [level, setLevel] = useState(1); // 1, 2, or 3
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [selectedDateRow, setSelectedDateRow] = useState(null);

  const [datePreset, setDatePreset] = useState('All Time');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isDateDropdownOpen, setIsDateDropdownOpen] = useState(false);

  const handlePresetChange = (preset) => {
    setDatePreset(preset);
    const now = new Date();
    let start = '';
    let end = '';

    if (preset === 'Today') {
      start = new Date(now.setHours(0,0,0,0)).toISOString();
      end = new Date(now.setHours(23,59,59,999)).toISOString();
    } else if (preset === 'This Week') {
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
      start = new Date(firstDay.setHours(0,0,0,0)).toISOString();
      end = new Date().toISOString();
    } else if (preset === 'This Month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      start = new Date(firstDay.setHours(0,0,0,0)).toISOString();
      end = new Date().toISOString();
    }
    
    setStartDate(start);
    setEndDate(end);
    setIsDateDropdownOpen(false);
    
    // Reset back to level 1 when filter changes
    setLevel(1);
    setSelectedTemplate(null);
    setSelectedDateRow(null);
  };

  const userId = user?.id;

  const goToLevel2 = useCallback((template) => {
    setSelectedTemplate(template);
    setLevel(2);
  }, []);

  const goToLevel3 = useCallback((dateRow) => {
    setSelectedDateRow(dateRow);
    setLevel(3);
  }, []);

  const goBack = useCallback(() => {
    if (level === 3) setLevel(2);
    else if (level === 2) { setLevel(1); setSelectedTemplate(null); }
  }, [level]);

  if (!userId) return null;

  return (
    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-6 shadow-2xl shadow-black/10 mt-8">

      {/* ─ Header ─ */}
      <div className="flex items-center gap-4 mb-6">
        {level > 1 && (
          <button
            onClick={goBack}
            className="w-8 h-8 rounded-lg bg-white/5 border border-glass-border flex items-center justify-center text-text-muted hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0"
          >
            <ChevronLeft size={16} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-bold text-white">
            {level === 1 && 'Recent Activity'}
            {level === 2 && selectedTemplate?.template_name}
            {level === 3 && `${fmt(selectedDateRow?.submitted_day)}`}
          </h3>
          {/* Breadcrumb */}
          <p className="text-[0.7rem] text-text-muted mt-1 flex items-center gap-1.5 flex-wrap">
            <span
              className={`cursor-pointer hover:text-white transition-colors ${level === 1 ? 'text-white font-semibold' : ''}`}
              onClick={() => { setLevel(1); setSelectedTemplate(null); }}
            >
              Templates
            </span>
            {level >= 2 && (
              <>
                <ChevronRight size={10} />
                <span
                  className={`cursor-pointer hover:text-white transition-colors ${level === 2 ? 'text-white font-semibold' : ''}`}
                  onClick={() => level === 3 && setLevel(2)}
                >
                  {selectedTemplate?.template_name}
                </span>
              </>
            )}
            {level === 3 && (
              <>
                <ChevronRight size={10} />
                <span className="text-white font-semibold">
                  {fmt(selectedDateRow?.submitted_day)}
                  {selectedDateRow?.is_backdated && (
                    <span className="text-amber-400 ml-1">· For {fmtShort(selectedDateRow?.selected_date)}</span>
                  )}
                </span>
              </>
            )}
          </p>
        </div>
        
        {/* Date Filter Dropdown */}
        <div className="relative shrink-0 ml-auto">
          <button 
            onClick={() => setIsDateDropdownOpen(!isDateDropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 bg-bg-card backdrop-blur-xl border border-glass-border rounded-xl text-[12px] font-bold text-white shadow-lg hover:bg-white/10 transition-all active:scale-95 cursor-pointer"
          >
            <Calendar size={14} className="text-accent" />
            <span>{datePreset}</span>
            <ChevronDown size={14} className={`transition-transform duration-300 ${isDateDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isDateDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsDateDropdownOpen(false)}></div>
              <div className="absolute right-0 mt-2 w-40 bg-bg-card backdrop-blur-2xl border border-glass-border rounded-2xl p-2 shadow-2xl z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                <div className="text-[10px] font-bold text-white/40 px-2.5 py-1.5 uppercase tracking-wider border-b border-glass-border/30 mb-1">
                  Filter Activity
                </div>
                {['All Time', 'Today', 'This Week', 'This Month'].map(preset => (
                  <button
                    key={preset}
                    onClick={() => handlePresetChange(preset)}
                    className={`w-full text-left px-2.5 py-2 rounded-xl text-xs transition-colors flex items-center justify-between ${datePreset === preset ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted hover:bg-white/5 hover:text-white'}`}
                  >
                    <span>{preset}</span>
                    {datePreset === preset && <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ─ Levels ─ */}
      <div className="animate-[fadeIn_0.3s_ease]">
        {level === 1 && <TemplateList userId={userId} onSelect={goToLevel2} startDate={startDate} endDate={endDate} />}
        {level === 2 && selectedTemplate && (
          <DateList userId={userId} template={selectedTemplate} onSelect={goToLevel3} startDate={startDate} endDate={endDate} />
        )}
        {level === 3 && selectedTemplate && selectedDateRow && (
          <ResponseDetail userId={userId} template={selectedTemplate} dateRow={selectedDateRow} />
        )}
      </div>
    </div>
  );
};

export default ActivityExplorer;
