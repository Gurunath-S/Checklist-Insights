import React, { useState, useEffect } from 'react';
import { X, Hash, CheckCircle2, MessageSquare, XCircle } from 'lucide-react';
import { formatDate } from './ReportConstants';
import { getReportDataApi } from '../services/reportsService';

export default function InspectionModal({ selectedReport, onClose }) {
  const [reportDetails, setReportDetails] = useState([]);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [detailsError, setDetailsError] = useState(null);

  useEffect(() => {
    if (!selectedReport) return;

    const fetchDetails = async () => {
      Promise.resolve().then(() => setDetailsLoading(true));
      try {
        const dateParam = selectedReport.checklist_date
          ? String(selectedReport.checklist_date).slice(0, 10)
          : String(selectedReport.submitted_day).slice(0, 10);
        const url = `/insights/reports/detail?userId=${selectedReport.organisation_user_id}&templateId=${selectedReport.template_id}&date=${dateParam}`;
        const data = await getReportDataApi(url);
        setReportDetails(data || []);
        setDetailsError(null);
      } catch (err) {
        console.error(err);
        setDetailsError('Failed to fetch details.');
      } finally {
        setDetailsLoading(false);
      }
    };

    fetchDetails();
  }, [selectedReport]);

  if (!selectedReport) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-fade-in">
      <div className="bg-bg-card backdrop-blur-2xl border border-glass-border rounded-3xl p-6 max-w-2xl w-full shadow-2xl flex flex-col max-h-[85vh] animate-in slide-in-from-bottom-4 duration-300">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b border-glass-border/30 pb-4 mb-4 shrink-0">
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider bg-accent/15 border border-accent/25 text-accent px-2 py-0.5 rounded-full">
              Detailed Submission Log
            </span>
            <h3 className="text-base font-extrabold text-white mt-1.5">
              {selectedReport.template_name}
            </h3>
            <p className="text-xs text-text-muted mt-1">
              Submitted by <span className="text-white font-semibold">{selectedReport.user_name}</span> for <span className="text-white font-semibold">{formatDate(selectedReport.checklist_date || selectedReport.submitted_day)}</span>
              {selectedReport.selected_date && String(selectedReport.submitted_day).slice(0,10) !== String(selectedReport.checklist_date || selectedReport.selected_date).slice(0,10) && (
                <span className="text-amber-400 font-medium ml-1.5">
                  (Submitted: {formatDate(selectedReport.submitted_day)})
                </span>
              )}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 hover:bg-white/10 rounded-lg text-text-muted hover:text-white transition-all cursor-pointer">
            <X size={18} />
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 py-1 space-y-3">
          {detailsLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-text-muted">
              <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-4" />
              <p className="text-xs">Loading items responses...</p>
            </div>
          ) : detailsError ? (
            <div className="py-12 text-center text-danger font-semibold text-xs bg-danger/5 border border-danger/15 rounded-2xl">
              {detailsError}
            </div>
          ) : reportDetails.length === 0 ? (
            <div className="py-12 text-center text-text-muted text-xs">
              No responses recorded in this submission.
            </div>
          ) : (
            reportDetails.map((item, idx) => {
              const isNumeric = item.input_type === 'Numeric';
              const isDone = item.status;
              const hasComment = item.comments && item.comments.trim().length > 0;
              return (
                <div key={idx} className="bg-white/5 border border-glass-border rounded-xl px-3 py-2 flex items-center justify-between gap-4 hover:bg-white/8 transition-all">
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${isNumeric ? 'bg-white/5 text-text-muted border border-glass-border' : (isDone ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'bg-rose-500/15 text-rose-400 border border-rose-500/25')}`}>
                      {isNumeric ? <Hash size={14} /> : (isDone ? <CheckCircle2 size={14} /> : <XCircle size={14} />)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-white leading-snug break-words whitespace-normal">{item.checklist_name}</p>
                      {hasComment && (
                        <p className="text-[10px] text-text-muted mt-0.5 flex items-start gap-1">
                          <MessageSquare size={11} className="shrink-0 mt-0.5 text-primary" />
                          <span className="italic leading-normal break-words whitespace-normal">{item.comments}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {isNumeric ? (
                      <span className="text-sm font-black text-primary-light">{item.input ?? '—'}</span>
                    ) : (
                      <span className={`flex items-center gap-1 text-xs font-black uppercase tracking-wider ${isDone ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {isDone ? <><CheckCircle2 size={13} /> Yes</> : <><XCircle size={13} /> No</>}
                      </span>
                    )}
                    <span className="text-[8px] font-black uppercase tracking-widest text-text-muted bg-white/5 px-2 py-0.5 rounded-full border border-glass-border">
                      {isNumeric ? 'numeric' : 'boolean'}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="mt-4 pt-4 border-t border-glass-border/30 shrink-0">
          <button onClick={onClose} className="w-full py-2.5 bg-white/5 hover:bg-white/10 border border-glass-border text-xs font-bold text-white rounded-xl">
            Close Inspector
          </button>
        </div>

      </div>
    </div>
  );
}
