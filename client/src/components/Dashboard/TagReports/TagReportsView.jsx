import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Hash } from 'lucide-react';
import LoadingState from '../../UI/LoadingState';

// Modular Imports
import TagFilters from './TagFilters';
import TagRelationshipGraph from './TagRelationshipGraph';
import TagPerformanceChart from './TagPerformanceChart';
import TagTemplatesTable from './TagTemplatesTable';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

const TagReportsView = () => {
  const [tagReports, setTagReports] = useState([]);
  const [tagLoading, setTagLoading] = useState(true);
  const [selectedTag, setSelectedTag] = useState(null);
  
  // Tag-specific filters
  const [tagSearch, setTagSearch] = useState('');
  const [tagPositionFilter, setTagPositionFilter] = useState('all');
  const [tagRecurrenceFilter, setTagRecurrenceFilter] = useState('all');
  const [tagDatePreset, setTagDatePreset] = useState('all');
  const [tagStartDate, setTagStartDate] = useState('');
  const [tagEndDate, setTagEndDate] = useState('');

  // SVG Scroll sync
  const [tagScrollTop, setTagScrollTop] = useState(0);

  const getPresetDates = useCallback((preset) => {
    const now = new Date();
    let start = '';
    let end = '';

    if (preset === 'today') {
      start = new Date(now.setHours(0,0,0,0)).toISOString();
      end = new Date(now.setHours(23,59,59,999)).toISOString();
    } else if (preset === 'week') {
      const firstDay = new Date(now.setDate(now.getDate() - now.getDay()));
      start = new Date(firstDay.setHours(0,0,0,0)).toISOString();
      end = new Date().toISOString();
    } else if (preset === 'month') {
      const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
      start = new Date(firstDay.setHours(0,0,0,0)).toISOString();
      end = new Date().toISOString();
    }
    return { start, end };
  }, []);

  useEffect(() => {
    const fetchTags = async () => {
      Promise.resolve().then(() => setTagLoading(true));
      try {
        const token = localStorage.getItem('token');
        let url = `${API_BASE}/insights/reports/tags?`;
        
        if (tagDatePreset !== 'all' && tagDatePreset !== 'custom') {
          const { start, end } = getPresetDates(tagDatePreset);
          if (start) url += `&startDate=${encodeURIComponent(start)}`;
          if (end) url += `&endDate=${encodeURIComponent(end)}`;
        } else if (tagDatePreset === 'custom') {
          if (tagStartDate) {
            const start = new Date(tagStartDate + 'T00:00:00').toISOString();
            url += `&startDate=${encodeURIComponent(start)}`;
          }
          if (tagEndDate) {
            const end = new Date(tagEndDate + 'T23:59:59').toISOString();
            url += `&endDate=${encodeURIComponent(end)}`;
          }
        }

        const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
        const data = res.data || [];
        setTagReports(data);
        if (data.length > 0) {
          setSelectedTag(prevSelected => {
            if (!prevSelected) return data[0];
            const updated = data.find(t => t.tag_id === prevSelected.tag_id);
            return updated || data[0];
          });
        } else {
          setSelectedTag(null);
        }
      } catch (err) {
        console.error('Error fetching tags:', err);
      } finally {
        setTagLoading(false);
      }
    };

    fetchTags();
  }, [tagDatePreset, tagStartDate, tagEndDate, getPresetDates]);

  const handleTagScroll = (e) => {
    setTagScrollTop(e.target.scrollTop);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // Filtered tags for the left sidebar list
  const filteredTags = tagReports.filter(t => {
    const matchesSearch = !tagSearch || 
      t.tag_name.toLowerCase().includes(tagSearch.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(tagSearch.toLowerCase()));
      
    const matchesPosition = tagPositionFilter === 'all' || t.user_position === tagPositionFilter;
    const matchesRecurrence = tagRecurrenceFilter === 'all' || t.recurrent === tagRecurrenceFilter;

    return matchesSearch && matchesPosition && matchesRecurrence;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <TagFilters
        tagSearch={tagSearch}
        setTagSearch={setTagSearch}
        tagPositionFilter={tagPositionFilter}
        setTagPositionFilter={setTagPositionFilter}
        tagRecurrenceFilter={tagRecurrenceFilter}
        setTagRecurrenceFilter={setTagRecurrenceFilter}
        tagDatePreset={tagDatePreset}
        setTagDatePreset={setTagDatePreset}
        tagStartDate={tagStartDate}
        setTagStartDate={setTagStartDate}
        tagEndDate={tagEndDate}
        setTagEndDate={setTagEndDate}
        tagReports={tagReports}
      />

      {tagLoading ? (
        <LoadingState />
      ) : tagReports.length === 0 ? (
        <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-12 text-center text-text-muted font-semibold">
          No tag submissions found for the specified filters.
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Tags List */}
          <div className="lg:col-span-5 space-y-3">
            <p className="text-[10px] font-black uppercase tracking-widest text-text-muted px-1">Tags List ({filteredTags.length})</p>
            <div className="space-y-3 max-h-[580px] overflow-y-auto pr-1 custom-scrollbar">
              {filteredTags.length === 0 ? (
                <div className="p-8 border border-glass-border/40 border-dashed rounded-2xl flex items-center justify-center text-text-muted text-xs font-semibold bg-white/2">
                  No tags match the selected filters.
                </div>
              ) : (
                filteredTags.map((t) => {
                  const isSelected = selectedTag?.tag_id === t.tag_id;
                  return (
                    <button
                      key={t.tag_id}
                      type="button"
                      onClick={() => setSelectedTag(t)}
                      className={`w-full text-left p-4 rounded-3xl border transition-all duration-300 cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-br from-primary/15 to-accent/10 border-accent/40 shadow-xl shadow-accent/5'
                          : 'bg-bg-card border-glass-border/60 hover:bg-white/5'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <div className={`p-2 rounded-xl ${isSelected ? 'bg-accent/20 text-accent' : 'bg-white/5 text-text-muted'}`}>
                            <Hash size={16} />
                          </div>
                          <div>
                            <h4 className="text-xs font-black text-white uppercase tracking-wider">{t.tag_name}</h4>
                            <p className="text-[10px] text-text-muted mt-0.5 line-clamp-1">{t.description || 'No description'}</p>
                          </div>
                        </div>
                        <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                          t.recurrent === 'YES' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-white/5 text-text-muted'
                        }`}>
                          {t.recurrent}
                        </span>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 border-t border-glass-border/30 pt-3">
                        <div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-text-muted block">Templates</span>
                          <span className="text-xs font-bold text-white">{t.templates_count}</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-text-muted block">Submissions</span>
                          <span className="text-xs font-bold text-white">{t.total_submissions}</span>
                        </div>
                        <div>
                          <span className="text-[8px] font-bold uppercase tracking-wider text-text-muted block">Compliance</span>
                          <span className="text-xs font-black text-accent">{t.avg_completion_rate}%</span>
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Visual Relations & Details */}
          <div className="lg:col-span-7 space-y-6">
            {selectedTag ? (
              <>
                <TagRelationshipGraph
                  selectedTag={selectedTag}
                  tagScrollTop={tagScrollTop}
                  handleTagScroll={handleTagScroll}
                  formatDate={formatDate}
                />
                
                <TagPerformanceChart
                  filteredTags={filteredTags}
                  selectedTag={selectedTag}
                />

                <TagTemplatesTable
                  selectedTag={selectedTag}
                />
              </>
            ) : (
              <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-12 text-center text-text-muted font-semibold">
                Select a tag to view relationships and performance.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagReportsView;
