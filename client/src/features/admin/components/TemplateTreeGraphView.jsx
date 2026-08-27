import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  LayoutTemplate, Tag, Users, AlertTriangle, 
  ChevronDown, ChevronRight, Info, RefreshCw, 
  Layers, X, Plus, Minus, Maximize2, Palette, ArrowLeft
} from 'lucide-react';

// ── Read CSS variable helper ──────────────────────────────────────────────────
function cssVar(name) {
  return typeof document !== 'undefined'
    ? getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    : '';
}

// ── Resolve per-theme node palette ───────────────────────────────────────────
function getNodePalette(theme) {
  const isLight = theme === 'light';
  return {
    isLight,
    cardBg:       isLight ? 'rgba(248,250,252,0.97)' : 'rgba(15,23,42,0.95)',
    cardBgRoot:   isLight ? 'rgba(238,240,255,0.97)' : 'rgba(30,27,75,0.97)',
    cardBgOrphan: isLight ? 'rgba(255,241,242,0.97)' : 'rgba(28,10,10,0.97)',
    shadowFill:   isLight ? 'rgba(0,0,0,0.06)'       : 'rgba(0,0,0,0.35)',
    textMain:     isLight ? '#0f172a'                 : '#ffffff',
    textMuted:    isLight ? '#475569'                 : '#94a3b8',
    textSub:      isLight ? '#64748b'                 : '#cbd5e1',
    // Theme-safe accent colors for node types
    tagAccent:    isLight ? '#d97706' : '#fbbf24',
    tagStroke:    isLight ? '#d97706' : '#fbbf24',
    tmplAccent:   isLight ? '#059669' : '#34d399',
    tmplStroke:   isLight ? '#059669' : '#10b981',
    orphanAccent: isLight ? '#e11d48' : '#fda4af',
    orphanStroke: isLight ? '#e11d48' : '#f43f5e',
    ownerOk:      isLight ? '#059669' : '#34d399',
    ownerMissing: isLight ? '#dc2626' : '#f87171',
    priorityHigh: isLight ? '#dc2626' : '#f87171',
    priorityMed:  isLight ? '#d97706' : '#fbbf24',
    priorityLow:  isLight ? '#059669' : '#34d399',
  };
}

// ── Radial Mind-Map SVG ──────────────────────────────────────────────────────
const RadialMindMap = ({ centerLabel, centerSub, nodes, nodePalette: p, onNodeClick, accentColor, rootBg, canvasBgStyle = 'grid' }) => {
  const svgRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [hovered, setHovered] = useState(null);
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Layout constants
  const CX = 0, CY = 0;
  const ROOT_W = 160, ROOT_H = 52;
  const NODE_W = 200, NODE_H = 68;
  const total = nodes.length;
  const BASE_RADIUS = 210;

  // Compute initial angle + position
  let positioned = nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / total - Math.PI / 2;
    let r = BASE_RADIUS;
    if (total > 14) {
      const tier = i % 3;
      r = BASE_RADIUS + tier * 125;
    } else if (total > 5) {
      const tier = i % 2;
      r = BASE_RADIUS + tier * 120;
    }
    const nx = CX + r * Math.cos(angle);
    const ny = CY + r * Math.sin(angle);
    return { ...n, nx, ny, angle };
  });

  // Collision resolution relaxation
  const padX = 15;
  const padY = 15;
  for (let iter = 0; iter < 30; iter++) {
    for (let i = 0; i < total; i++) {
      for (let j = i + 1; j < total; j++) {
        const a = positioned[i];
        const b = positioned[j];

        const minDistanceX = NODE_W + padX;
        const minDistanceY = NODE_H + padY;

        const dx = b.nx - a.nx;
        const dy = b.ny - a.ny;
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);

        if (absDx < minDistanceX && absDy < minDistanceY) {
          const overlapX = minDistanceX - absDx;
          const overlapY = minDistanceY - absDy;

          if (overlapX < overlapY) {
            const pushX = (overlapX / 2) * (dx === 0 ? 1 : Math.sign(dx));
            positioned[i].nx -= pushX;
            positioned[j].nx += pushX;
          } else {
            const pushY = (overlapY / 2) * (dy === 0 ? 1 : Math.sign(dy));
            positioned[i].ny -= pushY;
            positioned[j].ny += pushY;
          }
        }
      }
    }

    for (let i = 0; i < total; i++) {
      const a = positioned[i];
      const minDistanceX = (ROOT_W + NODE_W) / 2 + 30;
      const minDistanceY = (ROOT_H + NODE_H) / 2 + 30;

      const dx = a.nx - CX;
      const dy = a.ny - CY;
      const absDx = Math.abs(dx);
      const absDy = Math.abs(dy);

      if (absDx < minDistanceX && absDy < minDistanceY) {
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        const pushX = (dx / dist) * 15;
        const pushY = (dy / dist) * 15;
        positioned[i].nx += pushX;
        positioned[i].ny += pushY;
      }
    }
  }

  const maxRadius = positioned.reduce((max, n) => {
    const dist = Math.sqrt(n.nx * n.nx + n.ny * n.ny);
    return Math.max(max, dist);
  }, BASE_RADIUS);
  const vbSize = Math.max(900, (maxRadius + 180) * 2);
  const vbHalf = vbSize / 2;

  const makePath = (nx, ny) => {
    const angle = Math.atan2(ny - CY, nx - CX);
    const sx = CX + (ROOT_W / 2) * Math.cos(angle);
    const sy = CY + (ROOT_H / 2) * Math.sin(angle);
    const ex = nx - (NODE_W / 2) * Math.cos(angle);
    const ey = ny - (NODE_H / 2) * Math.sin(angle);
    const cp1x = sx + (ex - sx) * 0.45;
    const cp1y = sy;
    const cp2x = sx + (ex - sx) * 0.55;
    const cp2y = ey;
    return `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${ex} ${ey}`;
  };

  const onMouseDown = (e) => { dragging.current = true; lastPos.current = { x: e.clientX, y: e.clientY }; };
  const onMouseMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
  };
  const onMouseUp = () => { dragging.current = false; };
  const onWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(t => ({ ...t, scale: Math.min(2, Math.max(0.3, t.scale * delta)) }));
  };

  const pColor = (priority) => ({ HIGH: p.priorityHigh, MEDIUM: p.priorityMed, LOW: p.priorityLow }[priority] || null);

  const handleZoomIn = () => {
    setTransform(t => ({ ...t, scale: Math.min(2, t.scale * 1.2) }));
  };

  const handleZoomOut = () => {
    setTransform(t => ({ ...t, scale: Math.max(0.3, t.scale / 1.2) }));
  };

  const handleReset = () => {
    setTransform({ x: 0, y: 0, scale: 1 });
  };

  return (
    <div className={`relative w-full h-full overflow-hidden ${p.isLight ? 'bg-slate-100' : 'bg-[#090d16]'}`}>
      <svg
        ref={svgRef}
        viewBox={`${-vbHalf} ${-vbHalf} ${vbSize} ${vbSize}`}
        style={{ width: '100%', height: '100%', cursor: dragging.current ? 'grabbing' : 'grab', userSelect: 'none' }}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
        onWheel={onWheel}
      >
        <defs>
          <pattern id="tree-grid-pattern" width="36" height="36" patternUnits="userSpaceOnUse">
            <path d="M 36 0 L 0 0 0 36" fill="none" stroke={p.isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)"} strokeWidth="1"/>
            <circle cx="36" cy="36" r="1.2" fill={p.isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)"} />
          </pattern>
          <clipPath id="node-clip">
            <rect x={-NODE_W/2} y={-NODE_H/2} width={NODE_W} height={NODE_H} rx={12} />
          </clipPath>
          <clipPath id="root-clip">
            <rect x={-ROOT_W/2} y={-ROOT_H/2} width={ROOT_W} height={ROOT_H} rx={16} />
          </clipPath>
        </defs>

        {/* Grid Canvas Background Layer */}
        <rect
          x={-20000}
          y={-20000}
          width={40000}
          height={40000}
          fill={p.isLight ? '#f1f5f9' : '#090d16'}
        />
        <rect
          x={-20000}
          y={-20000}
          width={40000}
          height={40000}
          fill="url(#tree-grid-pattern)"
        />

        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          {positioned.map((n, i) => (
            <path
              key={i}
              d={makePath(n.nx, n.ny)}
              stroke={hovered === i ? accentColor : (p.isLight ? 'rgba(71,85,105,0.45)' : 'rgba(148,163,184,0.3)')}
              strokeWidth={hovered === i ? 2 : 1.4}
              fill="none"
              strokeLinecap="round"
              style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
            />
          ))}

          <g>
            <rect x={-ROOT_W/2} y={-ROOT_H/2} width={ROOT_W} height={ROOT_H} rx={16}
              fill={rootBg} stroke={accentColor} strokeWidth={2} />
            <rect x={-ROOT_W/2} y={-ROOT_H/2} width={6} height={ROOT_H}
              fill={accentColor} opacity={0.9} clipPath="url(#root-clip)" />
            <text x={-ROOT_W/2 + 16} y={-6} textAnchor="start"
              style={{ fontSize: 13, fontWeight: 800, fill: canvasBgStyle === 'dark' ? '#ffffff' : p.textMain, fontFamily: 'Outfit,Inter,sans-serif' }}>
              {centerLabel.length > 18 ? centerLabel.slice(0, 16) + '…' : centerLabel}
            </text>
            <text x={-ROOT_W/2 + 16} y={12} textAnchor="start"
              style={{ fontSize: 9.5, fontWeight: 600, fill: accentColor, fontFamily: 'Outfit,Inter,sans-serif', letterSpacing: '0.04em' }}>
              {centerSub}
            </text>
          </g>

          {positioned.map((n, i) => {
            const isH = hovered === i;
            const isTag = n.isTag;
            const pc = isTag ? null : pColor(n.priority);
            const tagLabel = n.tag ? (n.tag.length > 22 ? n.tag.slice(0, 20) + '…' : n.tag) : null;
            const nameLabel = n.name.length > 24 ? n.name.slice(0, 22) + '…' : n.name;
            const fillColor = isTag ? p.cardBg : (n.isOrphan ? p.cardBgOrphan : p.cardBg);
            const strokeColor = isTag ? p.tagStroke : (n.isOrphan ? p.orphanStroke : p.tmplStroke);
            const lineColor = isTag ? p.tagAccent : (n.isOrphan ? p.orphanAccent : p.tmplAccent);
            return (
              <g key={i}
                transform={`translate(${n.nx},${n.ny})`}
                style={{ cursor: 'pointer' }}
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onClick={() => onNodeClick && onNodeClick(n)}
              >
                <rect x={-NODE_W/2 + 4} y={-NODE_H/2 + 5} width={NODE_W} height={NODE_H}
                  rx={12} fill={p.shadowFill} />
                <rect x={-NODE_W/2} y={-NODE_H/2} width={NODE_W} height={NODE_H}
                  rx={12} fill={fillColor} stroke={isH ? accentColor : strokeColor}
                  strokeWidth={isH ? 2 : 1.5}
                  style={{ transition: 'stroke 0.15s' }} />
                <rect x={-NODE_W/2} y={-NODE_H/2} width={5} height={NODE_H}
                  fill={isH ? accentColor : lineColor} opacity={isH ? 1 : 0.85}
                  clipPath="url(#node-clip)"
                  style={{ transition: 'fill 0.15s, opacity 0.15s' }} />
                {pc && <circle cx={NODE_W/2 - 12} cy={-NODE_H/2 + 12} r={4} fill={pc} />}
                <text x={-NODE_W/2 + 14} y={-NODE_H/2 + 20}
                  textAnchor="start"
                  style={{ fontSize: 11.5, fontWeight: 800, fill: p.textMain, fontFamily: 'Outfit,Inter,sans-serif' }}>
                  {nameLabel}
                </text>
                {tagLabel && (
                  <text x={-NODE_W/2 + 14} y={-NODE_H/2 + 35}
                    textAnchor="start"
                    style={{ fontSize: 9, fontWeight: 700, fill: p.tagAccent, fontFamily: 'Outfit,Inter,sans-serif', letterSpacing: '0.02em' }}>
                    {tagLabel}{n.recurrent && n.recurrent !== 'None' ? ` • ${n.recurrent}` : ''}
                  </text>
                )}
                <text x={-NODE_W/2 + 14} y={tagLabel ? -NODE_H/2 + 48 : -NODE_H/2 + 38}
                  textAnchor="start"
                  style={{ fontSize: 9, fontWeight: 600, fill: p.textSub, fontFamily: 'Outfit,Inter,sans-serif' }}>
                  {isTag ? `${n.templatesCount || 0} template${n.templatesCount !== 1 ? 's' : ''}` : `${n.items || 0} items · ${n.recipients || 0} recipients`}
                </text>
                <text x={-NODE_W/2 + 14} y={tagLabel ? -NODE_H/2 + 60 : -NODE_H/2 + 50}
                  textAnchor="start"
                  style={{ fontSize: 9, fontWeight: 600,
                    fill: isTag ? p.tagAccent : (n.owner ? p.ownerOk : p.ownerMissing),
                    fontFamily: 'Outfit,Inter,sans-serif' }}>
                  {isTag ? `Recurrent: ${n.recurrent || 'None'}` : (n.owner ? `Owner: ${n.owner.length > 16 ? n.owner.slice(0,14)+'…' : n.owner}` : 'No Owner')}
                </text>
              </g>
            );
          })}
        </g>
      </svg>

      <div className={`absolute bottom-4 right-4 flex flex-col gap-1 p-1 border rounded-2xl shadow-xl backdrop-blur-md z-30 ${
        p.isLight ? 'bg-white/90 border-slate-200' : 'bg-white/5 border-glass-border'
      }`}>
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
            p.isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-text-muted hover:text-white'
          }`}
        >
          <Plus size={14} />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
            p.isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-text-muted hover:text-white'
          }`}
        >
          <Minus size={14} />
        </button>
        <div className={`h-px my-0.5 mx-1 ${p.isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
        <button
          onClick={handleReset}
          title="Reset View"
          className={`p-2 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
            p.isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-text-muted hover:text-white'
          }`}
        >
          <Maximize2 size={14} />
        </button>
      </div>
    </div>
  );
};

// ── Department Tree Component ───────────────────────────────────────────────
const DepartmentTreeCard = ({
  dept, nodePalette, onNodeClick, onRemove, animDir,
  graphViewMode, setGraphViewMode, focusedTag, setFocusedTag,
  canvasBgStyle, setCanvasBgStyle
}) => {
  const totalTemplates = useMemo(() =>
    dept.tags.reduce((sum, t) => sum + t.templates.length, 0),
    [dept]
  );

  const animClass = animDir === 'right'
    ? 'animate-slide-in-right'
    : 'animate-slide-in-left';

  const nodes = useMemo(() => {
    if (focusedTag) {
      return focusedTag.templates.map(tmpl => ({
        id: tmpl.id,
        name: tmpl.template_name,
        priority: tmpl.priority,
        recipients: tmpl.recipientCount,
        items: tmpl.itemCount,
        owner: tmpl.ownerName || '',
        tag: focusedTag.tag_name,
        recurrent: focusedTag.recurrent || 'None',
        isOrphan: false,
        itemsList: tmpl.itemsList
      }));
    }

    if (graphViewMode === 'tags') {
      return dept.tags.map(tag => ({
        name: tag.tag_name,
        templatesCount: tag.templates.length,
        recurrent: tag.recurrent || 'None',
        isTag: true,
        rawTag: tag
      }));
    }

    return dept.tags.flatMap(tag =>
      tag.templates.map(tmpl => ({
        id: tmpl.id,
        name: tmpl.template_name,
        priority: tmpl.priority,
        recipients: tmpl.recipientCount,
        items: tmpl.itemCount,
        owner: tmpl.ownerName || '',
        tag: tag.tag_name,
        recurrent: tag.recurrent || 'None',
        isOrphan: false,
        itemsList: tmpl.itemsList
      }))
    );
  }, [dept, graphViewMode, focusedTag]);

  const activeNodeCount = nodes.length;
  const cardHeight = Math.max(520, Math.min(950, 480 + activeNodeCount * 20));

  const handleNodeClick = (node) => {
    if (node.isTag) {
      setFocusedTag(node.rawTag);
    } else {
      onNodeClick(node);
    }
  };

  return (
    <div
      className={`border rounded-3xl p-6 shadow-xl space-y-4 ${animClass} ${
        nodePalette.isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-bg-card border-glass-border text-white'
      }`}
      style={{
        animation: animDir === 'right'
          ? 'slideInFromRight 0.28s cubic-bezier(0.22,1,0.36,1) both'
          : 'slideInFromLeft 0.28s cubic-bezier(0.22,1,0.36,1) both'
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className={`text-sm font-black flex items-center gap-2 ${nodePalette.isLight ? 'text-slate-900' : 'text-white'}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            {focusedTag ? `Tag: ${focusedTag.tag_name}` : `${dept.label} Hierarchy`}
          </h4>
          <p className={`text-[11px] mt-0.5 ${nodePalette.isLight ? 'text-slate-600' : 'text-text-muted'}`}>
            {focusedTag
              ? `${focusedTag.templates.length} Connected Templates`
              : `${dept.tags.length} Tag Classifications · ${totalTemplates} Connected Templates`
            }
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {!focusedTag && (
            <div className={`flex gap-1 p-1 rounded-xl border ${
              nodePalette.isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/5 border-glass-border'
            }`}>
              <button
                onClick={() => setGraphViewMode('templates')}
                className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                  graphViewMode === 'templates'
                    ? 'bg-primary text-white shadow-sm'
                    : nodePalette.isLight ? 'text-slate-600 hover:text-slate-900' : 'text-text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                Templates Map
              </button>
              <button
                onClick={() => setGraphViewMode('tags')}
                className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${
                  graphViewMode === 'tags'
                    ? 'bg-primary text-white shadow-sm'
                    : nodePalette.isLight ? 'text-slate-600 hover:text-slate-900' : 'text-text-muted hover:text-white hover:bg-white/5'
                }`}
              >
                Tags Map
              </button>
            </div>
          )}

          {focusedTag && (
            <button
              onClick={() => setFocusedTag(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-primary rounded-xl text-[10px] font-black transition-all cursor-pointer"
            >
              <ArrowLeft size={12} /> Back to Tags
            </button>
          )}

          {onRemove && (
            <button
              onClick={onRemove}
              title="Hide this department from graph view"
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                nodePalette.isLight
                  ? 'bg-slate-100 hover:bg-red-50 border-slate-200 hover:border-red-300 text-slate-600 hover:text-red-600'
                  : 'bg-white/5 hover:bg-red-500/15 border-white/10 hover:border-red-500/30 text-text-muted hover:text-red-400'
              }`}
            >
              <X size={12} /> Remove
            </button>
          )}
        </div>
      </div>

      <div 
        className={`w-full border rounded-2xl overflow-hidden relative ${
          nodePalette.isLight ? 'border-slate-200' : 'border-white/5'
        }`}
        style={{ height: `${cardHeight}px` }}
      >
        <RadialMindMap
          centerLabel={focusedTag ? focusedTag.tag_name : dept.label}
          centerSub={focusedTag ? 'TAG CLASSIFICATION' : 'DEPARTMENT'}
          nodes={nodes}
          nodePalette={nodePalette}
          onNodeClick={handleNodeClick}
          accentColor={focusedTag ? '#fbbf24' : cssVar('--color-accent')}
          rootBg={nodePalette.cardBg}
          canvasBgStyle={canvasBgStyle}
        />
      </div>
    </div>
  );
};

// ── Standalone Templates Tree Component ────────────────────────────────────────
const OrphanedTreeCard = ({ templates, nodePalette, onNodeClick, onRemove, animDir, canvasBgStyle, setCanvasBgStyle }) => {
  const totalTemplates = templates.length;
  const cardHeight = Math.max(520, Math.min(950, 480 + totalTemplates * 20));

  return (
    <div
      className={`border rounded-3xl p-6 shadow-xl space-y-4 ${
        nodePalette.isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-bg-card border-white/10 text-white'
      }`}
      style={{
        animation: animDir === 'right'
          ? 'slideInFromRight 0.28s cubic-bezier(0.22,1,0.36,1) both'
          : 'slideInFromLeft 0.28s cubic-bezier(0.22,1,0.36,1) both'
      }}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h4 className={`text-sm font-black flex items-center gap-2 ${nodePalette.isLight ? 'text-slate-900' : 'text-white'}`}>
            <span className="w-2.5 h-2.5 rounded-full bg-slate-500" />
            Standalone Templates
          </h4>
          <p className={`text-[11px] mt-0.5 ${nodePalette.isLight ? 'text-slate-600' : 'text-text-muted'}`}>
            {templates.length} Templates without Tag classification
          </p>
        </div>

        <div className="flex items-center gap-2">
          {onRemove && (
            <button
              onClick={onRemove}
              title="Hide standalone templates from graph view"
              className={`flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-[11px] font-bold transition-all cursor-pointer ${
                nodePalette.isLight
                  ? 'bg-slate-100 hover:bg-slate-200 border-slate-200 text-slate-600'
                  : 'bg-white/5 hover:bg-white/10 border-white/10 text-text-muted hover:text-white'
              }`}
            >
              <X size={12} /> Remove
            </button>
          )}
        </div>
      </div>

      <div 
        className={`w-full border rounded-2xl overflow-hidden relative ${
          nodePalette.isLight ? 'border-slate-200' : 'border-white/10'
        }`}
        style={{ height: `${cardHeight}px` }}
      >
        <RadialMindMap
          centerLabel="Standalone"
          centerSub="NO TAG CLASSIFICATION"
          nodes={templates.map(tmpl => ({
            name: tmpl.template_name,
            priority: tmpl.priority,
            recipients: tmpl.recipientCount,
            items: tmpl.itemCount,
            owner: tmpl.ownerName || '',
            tag: null,
            recurrent: null,
            isOrphan: true,
            itemsList: tmpl.itemsList
          }))}
          nodePalette={nodePalette}
          onNodeClick={onNodeClick}
          accentColor={nodePalette.orphanAccent}
          rootBg={nodePalette.cardBgOrphan}
          canvasBgStyle={canvasBgStyle}
        />
      </div>
    </div>
  );
};

// ── Inject Keyframe Styles once ──────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('tree-slide-styles')) {
  const s = document.createElement('style');
  s.id = 'tree-slide-styles';
  s.textContent = `
    @keyframes slideInFromRight {
      from { opacity: 0; transform: translateX(48px); }
      to   { opacity: 1; transform: translateX(0); }
    }
    @keyframes slideInFromLeft {
      from { opacity: 0; transform: translateX(-48px); }
      to   { opacity: 1; transform: translateX(0); }
    }
  `;
  document.head.appendChild(s);
}

// ── Main Graph View Container ────────────────────────────────────────────────
const TemplateTreeGraphView = ({ filteredData, theme, onNodeClick }) => {
  const [activeDeptKey, setActiveDeptKey] = useState(null);
  const [hiddenDepts, setHiddenDepts] = useState(new Set());
  const [animDir, setAnimDir] = useState('right');
  const [graphViewMode, setGraphViewMode] = useState('templates');
  const [focusedTag, setFocusedTag] = useState(null);
  const [canvasBgStyle, setCanvasBgStyle] = useState('grid'); // 'grid' | 'slate' | 'dark' | 'plain'

  const nodePalette = useMemo(() => getNodePalette(theme), [theme]);

  const deptTabs = useMemo(() => {
    if (!filteredData) return [];
    const tabs = filteredData.departments
      .filter(d => !hiddenDepts.has(d.name))
      .map(d => ({ key: d.name, label: d.label, isOrphan: false }));
    if (filteredData.orphanedTemplates.length > 0 && !hiddenDepts.has('__ORPHAN__')) {
      tabs.push({ key: '__ORPHAN__', label: 'Standalone', isOrphan: true });
    }
    return tabs;
  }, [filteredData, hiddenDepts]);

  const resolvedKey = useMemo(() => {
    if (!deptTabs.length) return null;
    if (deptTabs.some(t => t.key === activeDeptKey)) return activeDeptKey;
    return deptTabs[0].key;
  }, [deptTabs, activeDeptKey]);

  const switchTo = (key) => {
    const currentIdx = deptTabs.findIndex(t => t.key === resolvedKey);
    const nextIdx = deptTabs.findIndex(t => t.key === key);
    setAnimDir(nextIdx >= currentIdx ? 'right' : 'left');
    setActiveDeptKey(key);
    setFocusedTag(null);
  };

  const hideTab = (key) => {
    setHiddenDepts(prev => {
      const nextSet = new Set(prev);
      nextSet.add(key);
      return nextSet;
    });
    // Auto-advance to next available tab
    const idx = deptTabs.findIndex(t => t.key === key);
    const next = deptTabs[idx + 1] || deptTabs[idx - 1];
    if (next) { setActiveDeptKey(next.key); }
    if (onNodeClick) { onNodeClick(null); }
  };

  const resetHidden = () => {
    setHiddenDepts(new Set());
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Legend Row */}
      <div className={`border rounded-3xl shadow-xl px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${
        nodePalette.isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-bg-card border-glass-border text-white'
      }`}>
        <div className="flex flex-wrap items-center gap-4">
          {[
            { label: 'Department', color: '#c084fc' },
            { label: 'Tag', color: '#fbbf24' },
            { label: 'Template', color: '#10b981' },
            { label: 'Standalone', color: '#64748b' },
          ].map(({ label, color }) => (
            <div key={label} className={`flex items-center gap-1.5 text-[11px] font-semibold ${nodePalette.isLight ? 'text-slate-600' : 'text-text-muted'}`}>
              <span className="w-3 h-3 rounded-sm" style={{ background: color, opacity: 0.85 }} />
              {label}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className={`hidden lg:flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg ${
            nodePalette.isLight ? 'bg-slate-100 text-slate-600' : 'bg-white/2 text-text-muted'
          }`}>
            <Info size={10} /> Click a node to inspect · Drag to pan · Scroll to zoom
          </div>
          {hiddenDepts.size > 0 && (
            <button
              onClick={resetHidden}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/10 hover:bg-primary/20 border border-primary/30 text-primary rounded-xl text-[11px] font-bold transition-all cursor-pointer"
            >
              <RefreshCw size={11} /> Reset Hidden ({hiddenDepts.size})
            </button>
          )}
        </div>
      </div>

      {/* Pill Tab Bar */}
      {deptTabs.length > 0 && (
        <div className={`border rounded-3xl shadow-xl px-5 py-3 ${
          nodePalette.isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-bg-card border-glass-border text-white'
        }`}>
          <div className={`text-[10px] font-black uppercase tracking-widest mb-2.5 px-1 ${nodePalette.isLight ? 'text-slate-500' : 'text-text-muted'}`}>Department</div>
          <div className="flex flex-wrap gap-2">
            {deptTabs.map(tab => (
              <button
                key={tab.key}
                onClick={() => switchTo(tab.key)}
                className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${resolvedKey === tab.key
                    ? tab.isOrphan
                      ? 'bg-slate-700 text-white border-slate-700 shadow-lg'
                      : 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                    : tab.isOrphan
                      ? nodePalette.isLight ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-white/5 border-white/10 text-text-muted hover:text-white'
                      : nodePalette.isLight ? 'bg-slate-100 border-slate-200 text-slate-700 hover:bg-slate-200' : 'bg-white/5 border-glass-border text-text-muted hover:text-white hover:bg-white/10'
                  }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Tree Card */}
      {deptTabs.length === 0 ? (
        <div className={`border rounded-3xl p-16 text-center text-sm font-semibold ${
          nodePalette.isLight ? 'bg-white border-slate-200 text-slate-500' : 'bg-bg-card border-glass-border text-text-muted'
        }`}>
          All departments are hidden. Click "Reset Hidden" to restore them.
        </div>
      ) : resolvedKey === '__ORPHAN__' ? (
        <OrphanedTreeCard
          key="__ORPHAN__"
          templates={filteredData.orphanedTemplates}
          nodePalette={nodePalette}
          animDir={animDir}
          onNodeClick={onNodeClick}
          onRemove={() => hideTab('__ORPHAN__')}
          canvasBgStyle={canvasBgStyle}
          setCanvasBgStyle={setCanvasBgStyle}
        />
      ) : (() => {
        const dept = filteredData.departments.find(d => d.name === resolvedKey);
        if (!dept) return null;
        return (
          <DepartmentTreeCard
            key={dept.name}
            dept={dept}
            nodePalette={nodePalette}
            animDir={animDir}
            onNodeClick={onNodeClick}
            onRemove={() => hideTab(dept.name)}
            graphViewMode={graphViewMode}
            setGraphViewMode={setGraphViewMode}
            focusedTag={focusedTag}
            setFocusedTag={setFocusedTag}
            canvasBgStyle={canvasBgStyle}
            setCanvasBgStyle={setCanvasBgStyle}
          />
        );
      })()}
    </div>
  );
};

export default TemplateTreeGraphView;
