import React, { useState } from 'react';
import { Calendar, ChevronRight, Search } from 'lucide-react';

const DATE_PRESETS = [
  { value: 'all', label: 'All Time' },
  { value: 'today', label: 'Today' },
  { value: 'week', label: 'This Week' },
  { value: 'month', label: 'This Month' },
  { value: 'custom', label: 'Custom Range' }
];

const TagFilters = ({
  tagSearch, setTagSearch,
  tagPositionFilter, setTagPositionFilter,
  tagRecurrenceFilter, setTagRecurrenceFilter,
  tagDatePreset, setTagDatePreset,
  tagStartDate, setTagStartDate,
  tagEndDate, setTagEndDate,
  tagReports
}) => {
  const [isTagDateOpen, setIsTagDateOpen] = useState(false);
  const [isTagPosOpen, setIsTagPosOpen] = useState(false);
  const [isTagRecurOpen, setIsTagRecurOpen] = useState(false);

  return (
    <div className="relative z-50 bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-4 shadow-xl flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <span className="text-xs font-black uppercase tracking-wider text-white">Tag Performance & Relationship Insights</span>
        <div className="relative w-full sm:w-52">
          <button
            type="button"
            onClick={() => setIsTagDateOpen(!isTagDateOpen)}
            className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white/5 border border-glass-border rounded-xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-left"
          >
            <div className="flex items-center gap-2 truncate">
              <Calendar size={14} className="text-text-muted shrink-0" />
              <span className="truncate">
                {DATE_PRESETS.find(p => p.value === tagDatePreset)?.label || 'All Time'}
              </span>
            </div>
            <ChevronRight size={14} className={`text-text-muted transition-transform duration-300 ${isTagDateOpen ? 'rotate-90' : ''}`} />
          </button>
          {isTagDateOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsTagDateOpen(false)}></div>
              <div className="absolute right-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-xl p-2.5 shadow-2xl z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                {DATE_PRESETS.map((p) => (
                  <button key={p.value} type="button" onClick={() => { setTagDatePreset(p.value); setIsTagDateOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${tagDatePreset === p.value ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}>
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      {tagDatePreset === 'custom' && (
        <div className="flex flex-col sm:flex-row items-center gap-3 pt-3 border-t border-glass-border/30 animate-in slide-in-from-top-2 duration-200">
          <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">Submission Date:</span>
          <input type="date" value={tagStartDate} onChange={(e) => setTagStartDate(e.target.value)} className="w-full sm:w-40 bg-white/5 border border-glass-border rounded-xl px-3 py-1.5 text-xs text-white" />
          <span className="text-xs text-text-muted">to</span>
          <input type="date" value={tagEndDate} onChange={(e) => setTagEndDate(e.target.value)} className="w-full sm:w-40 bg-white/5 border border-glass-border rounded-xl px-3 py-1.5 text-xs text-white" />
        </div>
      )}

      {/* Search, Position and Recurrence Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-3 border-t border-glass-border/30">
        {/* Search Bar */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
          <input
            type="text"
            placeholder="Search tag name or desc..."
            value={tagSearch}
            onChange={(e) => setTagSearch(e.target.value)}
            className="w-full bg-white/5 border border-glass-border rounded-xl pl-10 pr-4 py-2 text-xs text-white focus:outline-none focus:border-accent/40 transition-all placeholder:text-text-muted/65"
          />
        </div>

        {/* User Position Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsTagPosOpen(!isTagPosOpen)}
            className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white/5 border border-glass-border rounded-xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-left"
          >
            <span className="truncate">
              Position: {tagPositionFilter === 'all' ? 'All Positions' : tagPositionFilter.replace(/_/g, ' ')}
            </span>
            <ChevronRight size={14} className={`text-text-muted transition-transform duration-300 ${isTagPosOpen ? 'rotate-90' : ''}`} />
          </button>
          {isTagPosOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsTagPosOpen(false)}></div>
              <div className="absolute left-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-xl p-2.5 shadow-2xl z-50 space-y-1 max-h-56 overflow-y-auto custom-scrollbar animate-in fade-in slide-in-from-top-2 duration-200">
                <button type="button" onClick={() => { setTagPositionFilter('all'); setIsTagPosOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${tagPositionFilter === 'all' ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}>
                  All Positions
                </button>
                {Array.from(new Set(tagReports.map(t => t.user_position).filter(Boolean))).map((pos) => (
                  <button key={pos} type="button" onClick={() => { setTagPositionFilter(pos); setIsTagPosOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${tagPositionFilter === pos ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}>
                    {pos.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Recurrence Dropdown */}
        <div className="relative">
          <button
            type="button"
            onClick={() => setIsTagRecurOpen(!isTagRecurOpen)}
            className="w-full flex items-center justify-between gap-2 px-4 py-2 bg-white/5 border border-glass-border rounded-xl text-xs text-white font-bold hover:bg-white/10 transition-all cursor-pointer text-left"
          >
            <span className="truncate">
              Recurrence: {tagRecurrenceFilter === 'all' ? 'All Recurrences' : tagRecurrenceFilter}
            </span>
            <ChevronRight size={14} className={`text-text-muted transition-transform duration-300 ${isTagRecurOpen ? 'rotate-90' : ''}`} />
          </button>
          {isTagRecurOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsTagRecurOpen(false)}></div>
              <div className="absolute left-0 mt-2 w-full bg-bg-card backdrop-blur-3xl border border-glass-border rounded-xl p-2.5 shadow-2xl z-50 space-y-1 animate-in fade-in slide-in-from-top-2 duration-200">
                <button type="button" onClick={() => { setTagRecurrenceFilter('all'); setIsTagRecurOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${tagRecurrenceFilter === 'all' ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}>
                  All Recurrences
                </button>
                {Array.from(new Set(tagReports.map(t => t.recurrent).filter(Boolean))).map((rec) => (
                  <button key={rec} type="button" onClick={() => { setTagRecurrenceFilter(rec); setIsTagRecurOpen(false); }} className={`w-full text-left px-3 py-2 rounded-xl text-xs transition-all hover:bg-white/5 ${tagRecurrenceFilter === rec ? 'bg-primary/10 text-white font-semibold' : 'text-text-muted'}`}>
                    {rec}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default TagFilters;
