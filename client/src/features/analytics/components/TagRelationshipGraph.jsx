import React from 'react';
import { Hash, Layers } from 'lucide-react';

const TagRelationshipGraph = ({ selectedTag, tagScrollTop, handleTagScroll, formatDate }) => {
  return (
    <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-5 shadow-xl space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-black uppercase tracking-widest text-white">Relationship Graph</h4>
          <p className="text-[9px] text-text-muted mt-0.5">Visualization of connected checklist templates</p>
        </div>
        <span className="text-[10px] font-bold text-accent bg-accent/10 border border-accent/20 px-3 py-1 rounded-xl">
          {selectedTag?.templates_count || 0} Connected
        </span>
      </div>

      {(!selectedTag?.templates || selectedTag.templates.length === 0) ? (
        <div className="h-[300px] border border-glass-border/40 border-dashed rounded-2xl flex items-center justify-center text-text-muted text-xs font-medium bg-white/2">
          No checklist templates connected to this tag.
        </div>
      ) : (
        <div className="relative h-[300px] border border-glass-border/30 rounded-2xl bg-white/2 overflow-hidden">
          {/* SVG connections behind everything */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none z-10">
            <defs>
              <linearGradient id="glowing-connector-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#6366f1" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            {selectedTag?.templates?.map((tpl, idx) => {
              const itemHeight = 68; // 56px card + 12px gap
              const cardCenterY = 56 + (idx * itemHeight) - tagScrollTop;
              
              // Check if the connection point is within the container bounds (top-6 to bottom-6 viewport)
              const isVisible = cardCenterY >= 28 && cardCenterY <= 272;
              if (!isVisible) return null;

              return (
                <g key={tpl.template_id}>
                  {/* Curve line */}
                  <path
                    d={`M 164 150 C 195 150, 203 ${cardCenterY}, 230 ${cardCenterY}`}
                    stroke="url(#glowing-connector-grad)"
                    strokeWidth="2"
                    fill="none"
                    className="opacity-70 transition-all duration-75"
                  />
                  {/* Pulsing indicator node */}
                  <circle cx={230} cy={cardCenterY} r="4" fill="#6366f1" className="opacity-75 animate-pulse" />
                  <circle cx={230} cy={cardCenterY} r="2" fill="#10b981" />
                </g>
              );
            })}
          </svg>

          {/* Left Center Node: Selected Tag */}
          <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center justify-center p-4 rounded-3xl bg-gradient-to-br from-primary/30 to-accent/30 border-2 border-accent/50 shadow-2xl shadow-accent/15 w-[140px] text-center shrink-0 z-20">
            <div className="p-2 bg-accent/20 rounded-2xl text-accent mb-2">
              <Hash size={20} />
            </div>
            <span className="text-[11px] font-black text-white uppercase tracking-wider block truncate max-w-full" title={selectedTag.tag_name}>{selectedTag.tag_name}</span>
            <span className="text-[9px] text-text-muted mt-1">Creator: {selectedTag.creator_name}</span>
          </div>

          {/* Right Side: Scrollable Templates Column */}
          <div 
            onScroll={handleTagScroll}
            className="absolute left-[234px] right-6 top-6 bottom-6 overflow-y-auto pr-1 space-y-3 custom-scrollbar py-1 z-20"
          >
            {selectedTag?.templates?.map((tpl) => (
              <div
                key={tpl.template_id}
                className="relative h-[56px] flex items-center pl-5 pr-4 rounded-2xl bg-bg-card/95 border border-glass-border/45 hover:border-accent/40 shadow-xl transition-all duration-300"
              >
                {/* Decorative Connector Point */}
                <div className="absolute left-0 top-1/2 -translate-x-1 w-2.5 h-2.5 bg-accent rounded-full border-2 border-bg-card shadow-sm shadow-accent/45" />
                
                <div className="flex items-center gap-3 w-full">
                  <div className="p-2 bg-primary/10 rounded-xl text-primary-light shrink-0">
                    <Layers size={14} />
                  </div>
                  <div className="truncate flex-1">
                    <p className="text-[11px] font-black text-white leading-normal truncate" title={tpl.template_name}>
                      {tpl.template_name}
                    </p>
                    <p className="text-[9px] text-text-muted mt-0.5 truncate">
                      Priority: {tpl.priority} | Created: {formatDate(tpl.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagRelationshipGraph;
