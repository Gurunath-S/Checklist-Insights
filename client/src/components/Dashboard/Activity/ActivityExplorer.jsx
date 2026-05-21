import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import {
  ClipboardList, ChevronRight, ChevronLeft,
  Calendar, CheckCircle2, Circle, MessageSquare,
  Hash, ToggleLeft, Loader2, FileText, CalendarClock
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

// ─── Level 1: Template Cards ──────────────────────────────────────────────────
const TemplateList = ({ userId, onSelect }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/activity/templates/${userId}`)
      .then(r => setTemplates(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {templates.map(t => (
        <button
          key={t.template_id}
          onClick={() => onSelect(t)}
          className="group w-full text-left bg-white/5 hover:bg-primary/10 border border-glass-border hover:border-primary/40 rounded-2xl p-6 transition-all duration-300 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5 cursor-pointer"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center text-primary shrink-0">
                <ClipboardList size={18} />
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
            <ChevronRight size={18} className="text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0 mt-1" />
          </div>
          <div className="mt-4 flex items-center gap-2">
            <span className="text-[0.65rem] uppercase tracking-widest font-bold text-text-muted bg-white/5 px-2.5 py-1 rounded-full border border-glass-border">
              {t.total_responses} responses
            </span>
          </div>
        </button>
      ))}
    </div>
  );
};

// ─── Level 2: Date Rows ───────────────────────────────────────────────────────
const DateList = ({ userId, template, onSelect }) => {
  const [dates, setDates] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios.get(`${API_BASE}/activity/dates/${userId}/${template.template_id}`)
      .then(r => setDates(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId, template.template_id]);

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
            className="group w-full text-left bg-white/5 hover:bg-primary/10 border border-glass-border hover:border-primary/40 rounded-2xl px-6 py-4 flex items-center gap-4 transition-all duration-200 hover:-translate-x-1 cursor-pointer"
          >
            {/* Date icon */}
            <div className="w-10 h-10 rounded-xl bg-white/5 border border-glass-border flex items-center justify-center text-text-muted group-hover:text-primary shrink-0 transition-colors">
              {isBackdated ? <CalendarClock size={17} /> : <Calendar size={17} />}
            </div>

            {/* Date info */}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">
                {submittedStr}
              </p>
              {isBackdated && (
                <p className="text-xs text-amber-400 font-medium mt-0.5 flex items-center gap-1">
                  <CalendarClock size={11} />
                  For: {selectedStr}
                </p>
              )}
            </div>

            {/* Completion badge */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              <span className="text-xs font-bold text-white">
                {d.completed_count}/{d.items_count} done
              </span>
              <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${completionPct}%` }}
                />
              </div>
            </div>

            <ChevronRight size={16} className="text-text-muted group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
          </button>
        );
      })}
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
            className="bg-white/5 border border-glass-border rounded-2xl px-6 py-4"
          >
            <div className="flex items-start justify-between gap-4">
              {/* Left: icon + name */}
              <div className="flex items-start gap-3 flex-1 min-w-0">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${isDone ? 'bg-success/15 text-success border border-success/25' : 'bg-white/5 text-text-muted border border-glass-border'}`}>
                  {isNumeric ? <Hash size={14} /> : <ToggleLeft size={14} />}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white leading-snug">
                    {item.checklist_name}
                  </p>
                  {hasComment && (
                    <p className="text-xs text-text-muted mt-1.5 flex items-start gap-1.5">
                      <MessageSquare size={11} className="shrink-0 mt-0.5 text-accent" />
                      <span className="italic leading-relaxed">{item.comments}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Right: value chip + status */}
              <div className="flex flex-col items-end gap-2 shrink-0">
                {/* Value */}
                {isNumeric ? (
                  <span className="text-lg font-extrabold text-accent leading-none">
                    {item.input ?? '—'}
                  </span>
                ) : (
                  <span className={`flex items-center gap-1 text-sm font-bold ${isDone ? 'text-success' : 'text-text-muted'}`}>
                    {isDone
                      ? <><CheckCircle2 size={16} /> Done</>
                      : <><Circle size={16} /> Pending</>
                    }
                  </span>
                )}
                {/* Type label */}
                <span className="text-[0.6rem] uppercase tracking-widest font-bold text-text-muted">
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
    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-[2.5rem] p-10 shadow-2xl shadow-black/10 mt-12">

      {/* ─ Header ─ */}
      <div className="flex items-center gap-4 mb-8">
        {level > 1 && (
          <button
            onClick={goBack}
            className="w-9 h-9 rounded-xl bg-white/5 border border-glass-border flex items-center justify-center text-text-muted hover:text-white hover:bg-white/10 transition-all cursor-pointer shrink-0"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-bold text-white">
            {level === 1 && 'Recent Activity'}
            {level === 2 && selectedTemplate?.template_name}
            {level === 3 && `${fmt(selectedDateRow?.submitted_day)}`}
          </h3>
          {/* Breadcrumb */}
          <p className="text-xs text-text-muted mt-1 flex items-center gap-1.5 flex-wrap">
            <span
              className={`cursor-pointer hover:text-white transition-colors ${level === 1 ? 'text-white font-semibold' : ''}`}
              onClick={() => { setLevel(1); setSelectedTemplate(null); }}
            >
              Templates
            </span>
            {level >= 2 && (
              <>
                <ChevronRight size={11} />
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
                <ChevronRight size={11} />
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
      </div>

      {/* ─ Levels ─ */}
      <div className="animate-[fadeIn_0.3s_ease]">
        {level === 1 && <TemplateList userId={userId} onSelect={goToLevel2} />}
        {level === 2 && selectedTemplate && (
          <DateList userId={userId} template={selectedTemplate} onSelect={goToLevel3} />
        )}
        {level === 3 && selectedTemplate && selectedDateRow && (
          <ResponseDetail userId={userId} template={selectedTemplate} dateRow={selectedDateRow} />
        )}
      </div>
    </div>
  );
};

export default ActivityExplorer;
