import React from 'react';

const TagTemplatesTable = ({ selectedTag }) => {
  return (
    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-5 shadow-xl space-y-4">
      <div>
        <h4 className="text-xs font-black uppercase tracking-widest text-white">Connected Checklist Templates Details</h4>
        <p className="text-[9px] text-text-muted mt-0.5">Submission volumes and compliance rates for templates under this tag</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-glass-border bg-white/5 text-[9px] font-black uppercase tracking-widest text-text-muted">
              <th className="px-4 py-3">Template Name</th>
              <th className="px-4 py-3">Owner / Creator</th>
              <th className="px-4 py-3">Priority</th>
              <th className="px-4 py-3">Activity</th>
              <th className="px-4 py-3">Compliance</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-glass-border/30">
            {selectedTag?.templates?.map((tpl) => (
              <tr key={tpl.template_id} className="hover:bg-white/2 transition-colors">
                <td className="px-4 py-3 text-xs font-bold text-accent">
                  {tpl.template_name}
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold text-white truncate max-w-[120px]">{tpl.owner_name}</span>
                    {tpl.owner_name !== tpl.creator_name && (
                      <span className="text-[8px] text-text-muted">Creator: {tpl.creator_name}</span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider border ${
                    tpl.priority === 'HIGH' 
                      ? 'bg-danger/15 border-danger/30 text-danger' 
                      : tpl.priority === 'MEDIUM' 
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400' 
                      : 'bg-primary/15 border-primary/30 text-primary-light'
                  }`}>
                    {tpl.priority}
                  </span>
                </td>
                <td className="px-4 py-3 text-[10px] text-white">
                  <div className="flex flex-col">
                    <span className="font-bold">{tpl.total_submissions} submissions</span>
                    <span className="text-[8px] text-text-muted">{tpl.total_responses} entries</span>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex flex-col gap-1 w-24">
                    <span className="text-[9px] font-bold text-white">{tpl.avg_completion_rate}% Compliance</span>
                    <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-accent rounded-full" 
                        style={{ width: `${tpl.avg_completion_rate}%` }} 
                      />
                    </div>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TagTemplatesTable;
