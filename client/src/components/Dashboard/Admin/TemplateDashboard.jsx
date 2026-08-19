import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import {
  LayoutTemplate, Tag, Users, AlertTriangle, CheckCircle,
  ChevronDown, ChevronRight, Info, GitBranch, List,
  RefreshCw, Layers, Shield, Repeat, Clock, Edit2,
  Check, X, Plus, Minus, Maximize2, Trash2, Link, Unlink, UserPlus, Save
} from 'lucide-react';
import { useThemeStore } from '../../../store/useThemeStore';

// ── Read CSS variable helper ──────────────────────────────────────────────────
function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
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

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:5000/api';

// ── Notification Banner ────────────────────────────────────────────────────────
const Notification = ({ notification, onClose }) => {
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [notification, onClose]);

  if (!notification) return null;

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl animate-in fade-in slide-in-from-top duration-300 ${notification.type === 'success'
        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        : 'bg-red-500/10 border-red-500/30 text-red-400'
      }`}>
      <span className="text-xs font-bold">{notification.message}</span>
      <button onClick={onClose} className="text-current hover:opacity-80 font-black cursor-pointer">✕</button>
    </div>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────
const StatCard = ({ icon, label, value, color }) => (
  <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-2xl p-4 flex items-center gap-4 shadow-lg">
    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
      {icon}
    </div>
    <div>
      <p className="text-2xl font-extrabold text-text-main">{value ?? '—'}</p>
      <p className="text-[11px] text-text-muted font-semibold uppercase tracking-wider">{label}</p>
    </div>
  </div>
);

const PrioritySelector = ({ priority, onChange, disabled }) => (
  <select
    value={priority}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-primary/50 cursor-pointer disabled:opacity-50"
  >
    <option value="LOW" className="bg-[#0f172a]">LOW</option>
    <option value="MEDIUM" className="bg-[#0f172a]">MEDIUM</option>
    <option value="HIGH" className="bg-[#0f172a]">HIGH</option>
  </select>
);

// ── Recurrence selector ────────────────────────────────────────────────────────
const RecurrenceSelector = ({ recurrent, onChange, disabled }) => (
  <select
    value={recurrent || 'None'}
    onChange={(e) => onChange(e.target.value)}
    disabled={disabled}
    className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-primary/50 cursor-pointer disabled:opacity-50"
  >
    <option value="None" className="bg-[#0f172a]">None</option>
    <option value="Daily" className="bg-[#0f172a]">Daily</option>
    <option value="Weekly" className="bg-[#0f172a]">Weekly</option>
    <option value="Monthly" className="bg-[#0f172a]">Monthly</option>
    <option value="Yearly" className="bg-[#0f172a]">Yearly</option>
  </select>
);

// ── Department row / accordion ────────────────────────────────────────────────
const DeptRow = ({ dept, users, allTags, allTemplates, onTemplateUpdate, onTagDelete, onTagUpdate, onTagCreate }) => {
  const [open, setOpen] = useState(false);
  const [showAddTag, setShowAddTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [newTagRecurrent, setNewTagRecurrent] = useState('None');
  const [savingTag, setSavingTag] = useState(false);

  const totalTemplates = dept.tags.reduce((s, t) => s + t.templates.length, 0);
  const connectedTemplates = dept.tags.reduce(
    (s, t) => s + t.templates.filter(tp => tp.recipientCount > 0).length, 0
  );

  const handleCreateTagSubmit = async (e) => {
    e.preventDefault();
    if (!newTagName.trim()) return;
    setSavingTag(true);
    const success = await onTagCreate({
      tag_name: newTagName.trim(),
      user_position: dept.name,
      recurrent: newTagRecurrent
    });
    setSavingTag(false);
    if (success) {
      setNewTagName('');
      setNewTagRecurrent('None');
      setShowAddTag(false);
    }
  };

  return (
    <div className="border border-glass-border rounded-2xl overflow-hidden mb-4 shadow-sm bg-white/2">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between p-4 bg-white/5 hover:bg-white/8 transition-all text-left cursor-pointer"
      >
        <div className="flex items-center gap-3">
          {open ? <ChevronDown size={16} className="text-primary" /> : <ChevronRight size={16} className="text-text-muted" />}
          <span className="text-sm font-bold text-white">{dept.label}</span>
          <span className="text-[10px] font-black uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded-full">
            {dept.tags.length} tag{dept.tags.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <span><span className="text-white font-bold">{connectedTemplates}</span>/{totalTemplates} connected</span>
        </div>
      </button>

      {open && (
        <div className="p-4 space-y-4 bg-white/1 border-t border-glass-border">
          {/* Tags list */}
          {dept.tags.map(tag => (
            <TagSection
              key={tag.id}
              tag={tag}
              users={users}
              allTags={allTags}
              allTemplates={allTemplates}
              onTemplateUpdate={onTemplateUpdate}
              onTagDelete={onTagDelete}
              onTagUpdate={onTagUpdate}
            />
          ))}

          {/* Add Tag Section */}
          {showAddTag ? (
            <form onSubmit={handleCreateTagSubmit} className="bg-bg-card p-4 rounded-xl border border-white/5 space-y-3 animate-fade-in">
              <h4 className="text-xs font-bold text-white">Create New Tag for {dept.label}</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Tag Name (e.g. Onboarding, Weekly Sync)"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-text-muted focus:outline-none focus:border-primary/50"
                  required
                />
                <div className="flex items-center gap-2">
                  <label className="text-[11px] text-text-muted font-bold">Recurrence:</label>
                  <RecurrenceSelector recurrent={newTagRecurrent} onChange={setNewTagRecurrent} />
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddTag(false)}
                  className="px-3 py-1 bg-white/5 hover:bg-white/10 text-xs font-bold text-text-muted rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingTag}
                  className="px-3 py-1 bg-primary hover:bg-primary-hover text-xs font-bold text-white rounded-lg flex items-center gap-1 cursor-pointer"
                >
                  {savingTag ? 'Saving...' : 'Add Tag'}
                </button>
              </div>
            </form>
          ) : (
            <button
              onClick={() => setShowAddTag(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/5 hover:bg-white/8 border border-white/5 rounded-xl text-xs font-bold text-primary hover:text-white transition-all cursor-pointer"
            >
              <Plus size={13} /> Add Tag classification
            </button>
          )}
        </div>
      )}
    </div>
  );
};

// ── Tag section within department ─────────────────────────────────────────────
const TagSection = ({ tag, users, allTags, allTemplates, onTemplateUpdate, onTagDelete, onTagUpdate }) => {
  const [showConnect, setShowConnect] = useState(false);
  const [open, setOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [tagName, setTagName] = useState(tag.tag_name);
  const [tagRecurrent, setTagRecurrent] = useState(tag.recurrent);
  const [saving, setSaving] = useState(false);

  const handleSaveTag = async () => {
    if (!tagName.trim()) return;
    setSaving(true);
    const success = await onTagUpdate(tag.id, { tag_name: tagName.trim(), recurrent: tagRecurrent });
    setSaving(false);
    if (success) {
      setIsEditing(false);
    }
  };

  // Compute eligible templates for the "Connect" dropdown
  const connectedIds = new Set(tag.templates.map(t => t.id));
  const unconnected = (allTemplates || []).filter(t => !t.tag_id);
  const connectedOthers = (allTemplates || []).filter(t => t.tag_id && !connectedIds.has(t.id));
  const hasEligible = unconnected.length > 0 || connectedOthers.length > 0;

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden bg-[#0f172a]/20">
      <div className="flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-all">
        {isEditing ? (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              className="bg-white/5 border border-glass-border rounded-lg px-2 py-1 text-xs font-bold text-white focus:outline-none focus:border-primary/50"
              placeholder="Tag Name"
            />
            <RecurrenceSelector recurrent={tagRecurrent} onChange={setTagRecurrent} />
            <button
              onClick={handleSaveTag}
              disabled={saving}
              className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/30 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
            <button
              onClick={() => {
                setTagName(tag.tag_name);
                setTagRecurrent(tag.recurrent);
                setIsEditing(false);
              }}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 text-text-muted rounded-lg text-[10px] font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2.5 min-w-0 cursor-pointer" onClick={() => setOpen(o => !o)}>
            {open ? <ChevronDown size={14} className="text-primary shrink-0" /> : <ChevronRight size={14} className="text-text-muted shrink-0" />}
            <span className="text-xs font-bold text-white truncate">{tag.tag_name}</span>
            <span className="text-[9px] uppercase tracking-wider bg-white/5 border border-white/10 text-text-muted px-1.5 py-0.5 rounded font-black">
              {tag.recurrent || 'None'}
            </span>
            <span className="text-[10px] text-text-muted">
              {tag.templates.length} template{tag.templates.length !== 1 ? 's' : ''}
            </span>
          </div>
        )}

        <div className="flex items-center gap-2 shrink-0">
          {!isEditing && (
            <>
              <button
                onClick={() => setIsEditing(true)}
                className="px-2.5 py-1 bg-white/5 hover:bg-white/10 text-text-muted hover:text-white rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
              >
                <Edit2 size={9} /> Edit Tag
              </button>
              <button
                onClick={() => onTagDelete(tag.id, tag.tag_name)}
                className="px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 rounded-lg text-[10px] font-bold transition-all cursor-pointer flex items-center gap-1"
                title="Delete this tag — all templates will become unconnected"
              >
                <Trash2 size={9} /> Delete Tag
              </button>
            </>
          )}
        </div>
      </div>

      {open && (
        <div className="border-t border-white/5 bg-[#0f172a]/40">
          <div className="divide-y divide-white/5">
            {tag.templates.length === 0 ? (
              <p className="text-[11px] text-text-muted p-3 text-center">No templates connected to this tag classification.</p>
            ) : (
              tag.templates.map(tmpl => (
                <TemplateRow
                  key={tmpl.id}
                  tmpl={tmpl}
                  tagId={tag.id}
                  users={users}
                  allTags={allTags}
                  onTemplateUpdate={onTemplateUpdate}
                />
              ))
            )}
          </div>

          {/* Connect template to this tag */}
          {hasEligible && (
            <div className="px-4 py-2.5 border-t border-white/5">
              {showConnect ? (
                <div className="flex items-center gap-2 flex-wrap">
                  <Link size={12} className="text-primary shrink-0" />
                  <span className="text-[10px] text-text-muted font-bold">Connect template:</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        onTemplateUpdate(parseInt(e.target.value), { tag_id: tag.id });
                        setShowConnect(false);
                      }
                    }}
                    className="bg-primary/10 border border-primary/25 rounded-lg px-2 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-primary/50 cursor-pointer max-w-[200px]"
                    defaultValue=""
                  >
                    <option value="" disabled className="bg-[#0f172a]">-- Select template --</option>
                    {unconnected.length > 0 && (
                      <optgroup label="Unconnected Templates" className="bg-[#0f172a] text-red-400 font-bold">
                        {unconnected.map(t => (
                          <option key={t.id} value={t.id} className="bg-[#0f172a] text-white">{t.template_name}</option>
                        ))}
                      </optgroup>
                    )}
                    {connectedOthers.length > 0 && (
                      <optgroup label="Connected to other tags" className="bg-[#0f172a] text-accent font-bold">
                        {connectedOthers.map(t => (
                          <option key={t.id} value={t.id} className="bg-[#0f172a] text-white">{t.template_name}</option>
                        ))}
                      </optgroup>
                    )}
                  </select>
                  <button
                    onClick={() => setShowConnect(false)}
                    className="p-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-all cursor-pointer"
                  >
                    <X size={11} />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowConnect(true)}
                  className="flex items-center gap-1.5 text-[10px] font-bold text-primary hover:text-white transition-all cursor-pointer"
                >
                  <Plus size={11} /> Connect a template to this tag
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
// ── Template row inside Tag ──────────────────────────────────────────────────
const TemplateRow = ({ tmpl, tagId, users, allTags, onTemplateUpdate }) => {
  const [updating, setUpdating] = useState(false);

  const handleUpdate = async (fields) => {
    setUpdating(true);
    await onTemplateUpdate(tmpl.id, fields);
    setUpdating(false);
  };

  return (
    <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-6 py-3 transition-all ${updating ? 'opacity-50 pointer-events-none' : 'hover:bg-white/2'}`}>
      <div className="flex items-center gap-2.5 min-w-0">
        <LayoutTemplate size={12} className="text-text-muted shrink-0" />
        <span className="text-xs text-white/95 font-semibold truncate max-w-[180px]" title={tmpl.template_name}>
          {tmpl.template_name}
        </span>
        {tmpl.repeating && (
          <span className="text-[9px] bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded-full font-bold">Repeating</span>
        )}
      </div>

      {/* Interactive Controls */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Priority */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-text-muted">Priority:</span>
          <PrioritySelector priority={tmpl.priority} onChange={(priority) => handleUpdate({ priority })} />
        </div>

        {/* Owner Selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-text-muted">Owner:</span>
          <select
            value={users.find(u => u.User?.name === tmpl.ownerName)?.id || 'null'}
            onChange={(e) => handleUpdate({ owner_id: e.target.value === 'null' ? null : e.target.value })}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-primary/50 cursor-pointer"
          >
            <option value="null" className="bg-[#0f172a]">Unassigned</option>
            {users.map(user => (
              <option key={user.id} value={user.id} className="bg-[#0f172a]">
                {user.User?.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tag Classification Selector (to move between classifications) */}
        <div className="flex items-center gap-1.5">
          <span className="text-[10px] text-text-muted">Tag:</span>
          <select
            value={tagId}
            onChange={(e) => handleUpdate({ tag_id: parseInt(e.target.value) })}
            className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-primary/50 cursor-pointer max-w-[120px]"
          >
            {allTags.map(t => (
              <option key={t.id} value={t.id} className="bg-[#0f172a]">
                {t.tag_name}
              </option>
            ))}
          </select>
        </div>

        {/* Metadata stats */}
        <span className="text-[10px] text-text-muted flex items-center gap-1 px-1 py-0.5 rounded bg-white/2">
          <Layers size={9} /> {tmpl.itemCount} items
        </span>

        {/* Disconnect Action → moves template to Unconnected area */}
        <button
          onClick={() => handleUpdate({ tag_id: null })}
          className="flex items-center gap-1 px-2.5 py-1 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 text-amber-400 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
          title="Disconnect from tag — template moves to Unconnected area"
        >
          <Unlink size={10} /> Disconnect
        </button>
      </div>
    </div>
  );
};

// ── Radial Mind-Map SVG (replaces react-d3-tree) ────────────────────────────
const RadialMindMap = ({ centerLabel, centerSub, nodes, nodePalette: p, onNodeClick, accentColor, rootBg }) => {
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
  // Base radius for the closest ring of nodes
  const BASE_RADIUS = 210;

  // Compute initial angle + position for each template node
  let positioned = nodes.map((n, i) => {
    const angle = (2 * Math.PI * i) / total - Math.PI / 2;
    // Assign nodes to concentric tiers to keep them close to the center without overlapping
    let r = BASE_RADIUS;
    if (total > 14) {
      // 3 Tiers for large sets
      const tier = i % 3;
      r = BASE_RADIUS + tier * 125;
    } else if (total > 5) {
      // 2 Tiers for medium sets
      const tier = i % 2;
      r = BASE_RADIUS + tier * 120;
    }
    const nx = CX + r * Math.cos(angle);
    const ny = CY + r * Math.sin(angle);
    return { ...n, nx, ny, angle };
  });

  // Collision resolution relaxation loop to ensure zero overlap
  const padX = 15;
  const padY = 15;
  for (let iter = 0; iter < 30; iter++) {
    // 1. Resolve overlaps between outer nodes
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

          // Push apart on the axis of minimum overlap
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

    // 2. Prevent overlapping with the center node
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

  // Calculate final bounds based on resolved node coordinates
  const maxRadius = positioned.reduce((max, n) => {
    const dist = Math.sqrt(n.nx * n.nx + n.ny * n.ny);
    return Math.max(max, dist);
  }, BASE_RADIUS);
  const vbSize = Math.max(900, (maxRadius + 180) * 2);
  const vbHalf = vbSize / 2;

  // Cubic bezier path: from root edge toward node
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

  // Pan handlers
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

  // Priority colour
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
    <div className="relative w-full h-full">
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
          <clipPath id="node-clip">
            <rect x={-NODE_W/2} y={-NODE_H/2} width={NODE_W} height={NODE_H} rx={12} />
          </clipPath>
          <clipPath id="root-clip">
            <rect x={-ROOT_W/2} y={-ROOT_H/2} width={ROOT_W} height={ROOT_H} rx={16} />
          </clipPath>
        </defs>
        <g transform={`translate(${transform.x},${transform.y}) scale(${transform.scale})`}>
          {/* Curved paths */}
          {positioned.map((n, i) => (
            <path
              key={i}
              d={makePath(n.nx, n.ny)}
              stroke={hovered === i ? accentColor : (p.isLight ? 'rgba(100,116,139,0.45)' : 'rgba(148,163,184,0.3)')}
              strokeWidth={hovered === i ? 2 : 1.4}
              fill="none"
              strokeLinecap="round"
              style={{ transition: 'stroke 0.2s, stroke-width 0.2s' }}
            />
          ))}

          {/* Root / center node */}
          <g>
            <rect x={-ROOT_W/2} y={-ROOT_H/2} width={ROOT_W} height={ROOT_H} rx={16}
              fill={rootBg} stroke={accentColor} strokeWidth={2} />
            <rect x={-ROOT_W/2} y={-ROOT_H/2} width={6} height={ROOT_H}
              fill={accentColor} opacity={0.9} clipPath="url(#root-clip)" />
            <text x={-ROOT_W/2 + 16} y={-6} textAnchor="start"
              style={{ fontSize: 13, fontWeight: 800, fill: p.textMain, fontFamily: 'Outfit,Inter,sans-serif' }}>
              {centerLabel.length > 18 ? centerLabel.slice(0, 16) + '…' : centerLabel}
            </text>
            <text x={-ROOT_W/2 + 16} y={12} textAnchor="start"
              style={{ fontSize: 9.5, fontWeight: 600, fill: accentColor, fontFamily: 'Outfit,Inter,sans-serif', letterSpacing: '0.04em' }}>
              {centerSub}
            </text>
          </g>

          {/* Template / Tag nodes */}
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
                {/* Shadow */}
                <rect x={-NODE_W/2 + 4} y={-NODE_H/2 + 5} width={NODE_W} height={NODE_H}
                  rx={12} fill={p.shadowFill} />
                {/* Card */}
                <rect x={-NODE_W/2} y={-NODE_H/2} width={NODE_W} height={NODE_H}
                  rx={12} fill={fillColor} stroke={isH ? accentColor : strokeColor}
                  strokeWidth={isH ? 2 : 1.5}
                  style={{ transition: 'stroke 0.15s' }} />
                {/* Accent strip */}
                <rect x={-NODE_W/2} y={-NODE_H/2} width={5} height={NODE_H}
                  fill={isH ? accentColor : lineColor} opacity={isH ? 1 : 0.85}
                  clipPath="url(#node-clip)"
                  style={{ transition: 'fill 0.15s, opacity 0.15s' }} />
                {/* Priority dot */}
                {pc && <circle cx={NODE_W/2 - 12} cy={-NODE_H/2 + 12} r={4} fill={pc} />}
                {/* Name */}
                <text x={-NODE_W/2 + 14} y={-NODE_H/2 + 20}
                  textAnchor="start"
                  style={{ fontSize: 11.5, fontWeight: 800, fill: p.textMain, fontFamily: 'Outfit,Inter,sans-serif' }}>
                  {nameLabel}
                </text>
                {/* Tag badge */}
                {tagLabel && (
                  <text x={-NODE_W/2 + 14} y={-NODE_H/2 + 35}
                    textAnchor="start"
                    style={{ fontSize: 9, fontWeight: 700, fill: p.tagAccent, fontFamily: 'Outfit,Inter,sans-serif', letterSpacing: '0.02em' }}>
                    ⬥ {tagLabel}{n.recurrent && n.recurrent !== 'None' ? ` · ${n.recurrent}` : ''}
                  </text>
                )}
                {/* Stats line */}
                <text x={-NODE_W/2 + 14} y={tagLabel ? -NODE_H/2 + 48 : -NODE_H/2 + 38}
                  textAnchor="start"
                  style={{ fontSize: 9, fontWeight: 600, fill: p.textSub, fontFamily: 'Outfit,Inter,sans-serif' }}>
                  {isTag ? `${n.templatesCount || 0} template${n.templatesCount !== 1 ? 's' : ''}` : `${n.items || 0} items · ${n.recipients || 0} recipients`}
                </text>
                {/* Owner / Recurrence details */}
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

      {/* Floating Zoom / Center controller */}
      <div className="absolute bottom-4 right-4 flex flex-col gap-1 p-1 bg-white/5 border border-glass-border rounded-2xl shadow-xl backdrop-blur-md z-30">
        <button
          onClick={handleZoomIn}
          title="Zoom In"
          className="p-2 hover:bg-white/10 text-text-muted hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center"
        >
          <Plus size={14} />
        </button>
        <button
          onClick={handleZoomOut}
          title="Zoom Out"
          className="p-2 hover:bg-white/10 text-text-muted hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center"
        >
          <Minus size={14} />
        </button>
        <div className="h-px bg-white/10 my-0.5 mx-1" />
        <button
          onClick={handleReset}
          title="Reset View"
          className="p-2 hover:bg-white/10 text-text-muted hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center"
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
  graphViewMode, setGraphViewMode, focusedTag, setFocusedTag
}) => {
  const totalTemplates = React.useMemo(() =>
    dept.tags.reduce((sum, t) => sum + t.templates.length, 0),
    [dept]
  );

  const animClass = animDir === 'right'
    ? 'animate-slide-in-right'
    : 'animate-slide-in-left';

  // Compute graph nodes based on view mode and focus state
  const nodes = React.useMemo(() => {
    if (focusedTag) {
      // Show templates of the focused tag
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
      // Show tags only
      return dept.tags.map(tag => ({
        name: tag.tag_name,
        templatesCount: tag.templates.length,
        recurrent: tag.recurrent || 'None',
        isTag: true,
        rawTag: tag
      }));
    }

    // Default: Show all templates flattened
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
      className={`bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-6 shadow-xl space-y-4 ${animClass}`}
      style={{
        animation: animDir === 'right'
          ? 'slideInFromRight 0.28s cubic-bezier(0.22,1,0.36,1) both'
          : 'slideInFromLeft 0.28s cubic-bezier(0.22,1,0.36,1) both'
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-black text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-accent" />
            {focusedTag ? `Tag: ${focusedTag.tag_name}` : `${dept.label} Hierarchy`}
          </h4>
          <p className="text-[11px] text-text-muted mt-0.5">
            {focusedTag
              ? `${focusedTag.templates.length} Connected Templates`
              : `${dept.tags.length} Tag Classifications · ${totalTemplates} Connected Templates`
            }
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Mode Switcher */}
          {!focusedTag && (
            <div className="flex gap-1 p-1 bg-white/5 border border-glass-border rounded-xl">
              <button
                onClick={() => setGraphViewMode('templates')}
                className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${graphViewMode === 'templates' ? 'bg-primary text-white' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
              >
                Templates Map
              </button>
              <button
                onClick={() => setGraphViewMode('tags')}
                className={`px-3 py-1 text-[10px] font-black rounded-lg transition-all cursor-pointer ${graphViewMode === 'tags' ? 'bg-primary text-white' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
              >
                Tags Map
              </button>
            </div>
          )}

          {focusedTag && (
            <button
              onClick={() => setFocusedTag(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-primary/20 hover:bg-primary/30 border border-primary/30 text-white rounded-xl text-[10px] font-black transition-all cursor-pointer"
            >
              ← Back to Tags
            </button>
          )}

          {onRemove && (
            <button
              onClick={onRemove}
              title="Hide this department from graph view"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-text-muted hover:text-red-400 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
            >
              <X size={12} /> Remove
            </button>
          )}
        </div>
      </div>

      <div 
        className="w-full bg-white/1 border border-white/5 rounded-2xl overflow-hidden relative"
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
        />
      </div>
    </div>
  );
};

// ── Orphaned Templates Tree Component ────────────────────────────────────────
const OrphanedTreeCard = ({ templates, nodePalette, onNodeClick, onRemove, animDir }) => {
  const totalTemplates = templates.length;
  const cardHeight = Math.max(520, Math.min(950, 480 + totalTemplates * 20));

  return (
    <div
      className="bg-bg-card backdrop-blur-xl border border-red-500/20 rounded-3xl p-6 shadow-xl space-y-4"
      style={{
        animation: animDir === 'right'
          ? 'slideInFromRight 0.28s cubic-bezier(0.22,1,0.36,1) both'
          : 'slideInFromLeft 0.28s cubic-bezier(0.22,1,0.36,1) both'
      }}
    >
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-black text-white flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
            Unconnected Templates
          </h4>
          <p className="text-[11px] text-text-muted mt-0.5">
            {templates.length} Templates without any Tag classification
          </p>
        </div>
        {onRemove && (
          <button
            onClick={onRemove}
            title="Hide orphans from graph view"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-red-500/15 border border-white/10 hover:border-red-500/30 text-text-muted hover:text-red-400 rounded-xl text-[11px] font-bold transition-all cursor-pointer"
          >
            <X size={12} /> Remove
          </button>
        )}
      </div>

      <div 
        className="w-full bg-red-500/2 border border-red-500/10 rounded-2xl overflow-hidden relative"
        style={{ height: `${cardHeight}px` }}
      >
        <RadialMindMap
          centerLabel="Unconnected"
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
        />
      </div>
    </div>
  );
};

// ── Custom node renderer for react-d3-tree ────────────────────────────────────
const CustomNode = ({ nodeDatum, onNodeClick, palette }) => {
  const t = nodeDatum.attributes?.type;
  const isRoot = t === 'root';
  const isDept = t === 'department';
  const isTag = t === 'tag';
  const isTemplate = t === 'template';
  const isOrphan = t === 'orphan';
  const isOrphanRoot = t === 'orphan-root';

  const p = palette || getNodePalette('classic');

  // Node card size — taller for templates to fit tag label
  const isTmplLike = isTemplate || isOrphan;
  const width = 240;
  const height = isTmplLike ? 96 : 84;
  const halfW = width / 2;
  const halfH = height / 2;

  // Theme-aware fills & strokes — all from palette, no hardcoded colors
  let fill, stroke, accentColor, subTextFill;

  if (isRoot)           { fill = p.cardBgRoot;   stroke = cssVar('--color-primary'); accentColor = cssVar('--color-primary'); }
  else if (isDept)      { fill = p.cardBg;       stroke = cssVar('--color-accent');  accentColor = cssVar('--color-accent'); }
  else if (isTag)       { fill = p.cardBg;       stroke = p.tagStroke;               accentColor = p.tagAccent; }
  else if (isTemplate)  { fill = p.cardBg;       stroke = p.tmplStroke;              accentColor = p.tmplAccent; }
  else if (isOrphanRoot){ fill = p.cardBgOrphan; stroke = p.orphanStroke;            accentColor = p.orphanAccent; }
  else                  { fill = p.cardBgOrphan; stroke = p.orphanStroke;            accentColor = p.orphanAccent; }

  subTextFill = p.textMuted;

  // Truncate label
  const nameLimit = isRoot ? 28 : 24;
  const displayName = nodeDatum.name.length > nameLimit
    ? nodeDatum.name.slice(0, nameLimit - 2) + '…'
    : nodeDatum.name;

  const priority = nodeDatum.attributes?.priority;
  const priorityColor = { HIGH: p.priorityHigh, MEDIUM: p.priorityMed, LOW: p.priorityLow }[priority] || null;

  return (
    <g onClick={() => onNodeClick && onNodeClick(nodeDatum)} style={{ cursor: 'pointer' }}>
      {/* Drop shadow */}
      <rect
        x={-halfW + 4} y={-halfH + 5}
        width={width} height={height}
        rx={12} ry={12}
        fill={p.shadowFill}
        opacity={1}
      />
      {/* Card background */}
      <rect
        x={-halfW} y={-halfH}
        width={width} height={height}
        rx={12} ry={12}
        fill={fill}
        stroke={stroke}
        strokeWidth={isRoot || isOrphanRoot ? 2 : 1.5}
        fillOpacity={0.97}
      />
      {/* Left accent strip */}
      <rect
        x={-halfW} y={-halfH}
        width={5} height={height}
        rx={12} ry={0}
        fill={accentColor}
        opacity={0.85}
      />

      {/* Priority dot */}
      {priorityColor && (
        <circle cx={halfW - 13} cy={-halfH + 13} r={4} fill={priorityColor} />
      )}

      {/* Node Name */}
      <text
        x={-halfW + 16}
        y={-halfH + 27}
        textAnchor="start"
        style={{
          fontSize: '12px',
          fontWeight: '800',
          fill: p.textMain,
          fontFamily: 'Outfit, Inter, sans-serif',
          letterSpacing: '0.01em'
        }}
      >
        {displayName}
      </text>

      {/* Sub-label by type */}
      {isRoot && (
        <text x={-halfW + 16} y={-halfH + 50} textAnchor="start"
          style={{ fontSize: '9.5px', fill: subTextFill, fontFamily: 'Outfit, Inter, sans-serif', fontWeight: '600' }}>
          Checklist Management System
        </text>
      )}

      {isDept && (
        <text x={-halfW + 16} y={-halfH + 50} textAnchor="start"
          style={{
            fontSize: '9.5px', fill: cssVar('--color-accent'), fontFamily: 'Outfit, Inter, sans-serif',
            fontWeight: '700', letterSpacing: '0.04em'
          }}>
          DEPARTMENT
        </text>
      )}

      {isTag && (
        <g>
          <text x={-halfW + 16} y={-halfH + 49} textAnchor="start"
            style={{ fontSize: '10px', fill: p.tagAccent, fontFamily: 'Outfit, Inter, sans-serif', fontWeight: '700' }}>
            Recurrence: {nodeDatum.attributes?.recurrent || 'None'}
          </text>
          <text x={-halfW + 16} y={-halfH + 64} textAnchor="start"
            style={{ fontSize: '9px', fill: subTextFill, fontFamily: 'Outfit, Inter, sans-serif' }}>
            Classification Tag
          </text>
        </g>
      )}

      {(isTemplate || isOrphan) && (
        <g>
          {/* Tag classification badge (shown inline since tree is flat) */}
          {nodeDatum.attributes?.tag && (
            <text x={-halfW + 16} y={-halfH + 44} textAnchor="start"
              style={{ fontSize: '9px', fill: p.tagAccent, fontFamily: 'Outfit, Inter, sans-serif', fontWeight: '700', letterSpacing: '0.03em' }}>
              ⬥ {nodeDatum.attributes.tag}{nodeDatum.attributes?.recurrent && nodeDatum.attributes.recurrent !== 'None' ? ` · ${nodeDatum.attributes.recurrent}` : ''}
            </text>
          )}
          <text x={-halfW + 16} y={nodeDatum.attributes?.tag ? -halfH + 58 : -halfH + 49} textAnchor="start"
            style={{ fontSize: '9.5px', fill: p.textSub, fontFamily: 'Outfit, Inter, sans-serif', fontWeight: '700' }}>
            {nodeDatum.attributes?.items || '0'} Items · {nodeDatum.attributes?.recipients || '0'} Recipients
          </text>
          <text x={-halfW + 16} y={nodeDatum.attributes?.tag ? -halfH + 72 : -halfH + 64} textAnchor="start"
            style={{
              fontSize: '9px',
              fill: nodeDatum.attributes?.owner ? p.ownerOk : p.ownerMissing,
              fontFamily: 'Outfit, Inter, sans-serif',
              fontWeight: '600'
            }}>
            {nodeDatum.attributes?.owner ? `Owner: ${nodeDatum.attributes.owner}` : 'No Owner Assigned'}
          </text>
        </g>
      )}

      {isOrphanRoot && (
        <text x={-halfW + 16} y={-halfH + 50} textAnchor="start"
          style={{
            fontSize: '9.5px', fill: p.orphanStroke, fontFamily: 'Outfit, Inter, sans-serif',
            fontWeight: '700', letterSpacing: '0.04em'
          }}>
          UNCONNECTED TEMPLATES
        </text>
      )}
    </g>
  );
};

// ── Node detail side panel ────────────────────────────────────────────────────
const NodeDetailPanel = ({ node, onClose, onDisconnectTemplate }) => {
  if (!node) return null;
  const isTag = node.isTag;

  return (
    <div className="fixed inset-y-0 right-0 w-85 bg-bg-card/98 border-l border-glass-border shadow-2xl z-50 p-6 overflow-y-auto animate-in slide-in-from-right duration-300 backdrop-blur-xl flex flex-col justify-between">
      <div>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 max-w-[80%]">
            {isTag ? <Tag size={16} className="text-accent" /> : <LayoutTemplate size={16} className="text-emerald-400" />}
            <h3 className="text-base font-black text-white truncate">{node.name}</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-muted hover:text-white transition-all cursor-pointer shrink-0"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6">
          {/* Metadata Section */}
          <div className="bg-white/2 border border-white/5 rounded-2xl p-4 space-y-3">
            <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted">Properties</h4>
            {isTag ? (
              <>
                <div className="flex justify-between items-center py-1.5 border-b border-white/5 last:border-0">
                  <span className="text-[11px] text-text-muted font-bold">Recurrence</span>
                  <span className="text-[11px] font-black text-white px-2 py-0.5 bg-accent/20 text-accent rounded-lg">{node.recurrent || 'None'}</span>
                </div>
                <div className="flex flex-col py-1.5 last:border-0">
                  <span className="text-[11px] text-text-muted font-bold mb-1">Description</span>
                  <span className="text-[11px] text-white/80 leading-relaxed font-semibold">{node.rawTag?.description || 'No description provided.'}</span>
                </div>
              </>
            ) : (
              <>
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-[11px] text-text-muted font-bold">Priority</span>
                  <span className={`text-[11px] font-black px-2 py-0.5 rounded-lg ${
                    node.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                    node.priority === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                    'bg-emerald-500/20 text-emerald-400'
                  }`}>
                    {node.priority}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-[11px] text-text-muted font-bold">Owner</span>
                  <span className={`text-[11px] font-black ${node.owner ? 'text-white' : 'text-red-400 font-bold'}`}>
                    {node.owner || 'No Owner Assigned'}
                  </span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-b border-white/5">
                  <span className="text-[11px] text-text-muted font-bold">Connected Recipients</span>
                  <span className="text-[11px] font-black text-white">{node.recipients || 0}</span>
                </div>
                {node.tag && (
                  <div className="flex justify-between items-center py-1.5 last:border-0">
                    <span className="text-[11px] text-text-muted font-bold">Associated Tag</span>
                    <span className="text-[11px] font-black text-accent">{node.tag}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* List Section: Templates for Tag, Checklist Items for Template */}
          {isTag ? (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted px-1">
                Connected Templates ({node.templatesCount || 0})
              </h4>
              {node.rawTag?.templates && node.rawTag.templates.length > 0 ? (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {node.rawTag.templates.map((tmpl, idx) => (
                    <div key={tmpl.id || idx} className="p-3 bg-white/2 hover:bg-white/5 border border-white/5 rounded-xl transition-all flex items-center justify-between">
                      <span className="text-xs text-white/90 font-bold truncate pr-3">{tmpl.template_name}</span>
                      <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${
                        tmpl.priority === 'HIGH' ? 'bg-red-500/20 text-red-400' :
                        tmpl.priority === 'MEDIUM' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                        {tmpl.priority}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic px-1">No templates currently linked to this tag.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <h4 className="text-[10px] font-black uppercase tracking-wider text-text-muted px-1">
                Checklist Items ({node.itemsList?.length || 0})
              </h4>
              {node.itemsList && node.itemsList.length > 0 ? (
                <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                  {node.itemsList.map((item, idx) => (
                    <div key={item.id || idx} className="p-3 bg-white/2 border border-white/5 rounded-xl flex gap-3 items-start">
                      <span className="w-5 h-5 rounded-full bg-white/5 border border-white/10 text-[10px] font-black text-text-muted flex items-center justify-center shrink-0 mt-0.5">
                        {idx + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white/90 font-bold leading-normal break-words">{item.checklist_name}</p>
                        <span className="text-[9px] font-black text-text-muted mt-1 inline-block uppercase tracking-widest bg-white/5 px-1.5 py-0.5 rounded">
                          {item.input_type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-text-muted italic px-1">No checklist items inside this template.</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 space-y-3 shrink-0">
        {!isTag && node.isOrphan && (
          <div className="p-3 rounded-2xl bg-red-500/10 border border-red-500/20">
            <p className="text-[11px] text-red-400 font-bold flex items-center gap-1.5">
              <AlertTriangle size={12} /> This template is unconnected — connect it to a tag classification.
            </p>
          </div>
        )}

        {!isTag && !node.isOrphan && (
          <button
            onClick={() => onDisconnectTemplate && onDisconnectTemplate(node.id)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/20 hover:border-amber-500/40 text-amber-400 rounded-2xl text-xs font-black transition-all cursor-pointer"
            title="Disconnect template from its tag — it will move to the Unconnected area"
          >
            <Unlink size={13} /> Disconnect Template
          </button>
        )}
      </div>
    </div>
  );
};

// ── CSS keyframes injected once for slide animations ─────────────────────────
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

// ── Main Dashboard Component ──────────────────────────────────────────────────
export default function TemplateDashboard() {
  const { theme } = useThemeStore();
  const [rawData, setRawData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('table'); // 'table' | 'graph'
  const [activeDeptKey, setActiveDeptKey] = useState(null);  // null = use first available
  const [hiddenDepts, setHiddenDepts] = useState(new Set());
  const [animDir, setAnimDir] = useState('right');
  const [selectedNode, setSelectedNode] = useState(null);
  const [notification, setNotification] = useState(null);
  const [graphViewMode, setGraphViewMode] = useState('templates'); // 'templates' | 'tags'
  const [focusedTag, setFocusedTag] = useState(null); // null or { id, tag_name, templates }
  const [searchTerm, setSearchTerm] = useState('');

  // Filter rawData based on search term
  const filteredData = React.useMemo(() => {
    if (!rawData) return null;
    if (!searchTerm.trim()) return rawData;

    const term = searchTerm.toLowerCase();

    const filteredDepts = rawData.departments.map(dept => {
      const filteredTags = dept.tags.map(tag => {
        const matchTag = tag.tag_name.toLowerCase().includes(term);
        const filteredTmpls = tag.templates.filter(t =>
          t.template_name.toLowerCase().includes(term)
        );
        return {
          ...tag,
          templates: matchTag ? tag.templates : filteredTmpls
        };
      }).filter(tag => tag.templates.length > 0);

      return {
        ...dept,
        tags: filteredTags
      };
    }).filter(dept => dept.tags.length > 0);

    const filteredOrphans = rawData.orphanedTemplates.filter(t =>
      t.template_name.toLowerCase().includes(term)
    );

    return {
      ...rawData,
      departments: filteredDepts,
      orphanedTemplates: filteredOrphans
    };
  }, [rawData, searchTerm]);

  // Gather flat list of all templates for tag assignment dropdowns
  const allTemplatesList = React.useMemo(() => {
    if (!rawData) return [];
    return [
      ...rawData.orphanedTemplates,
      ...rawData.departments.flatMap(d => d.tags.flatMap(t => t.templates))
    ];
  }, [rawData]);

  // Compute theme palette whenever theme changes
  const nodePalette = React.useMemo(() => getNodePalette(theme), [theme]);

  // Build the ordered tab list: visible depts + orphan tab if applicable
  const deptTabs = React.useMemo(() => {
    if (!filteredData) return [];
    const tabs = filteredData.departments
      .filter(d => !hiddenDepts.has(d.name))
      .map(d => ({ key: d.name, label: d.label, isOrphan: false }));
    if (filteredData.orphanedTemplates.length > 0 && !hiddenDepts.has('__ORPHAN__')) {
      tabs.push({ key: '__ORPHAN__', label: 'Unconnected', isOrphan: true });
    }
    return tabs;
  }, [filteredData, hiddenDepts]);

  // Keep activeDeptKey valid when tabs change
  const resolvedKey = React.useMemo(() => {
    if (!deptTabs.length) return null;
    if (deptTabs.some(t => t.key === activeDeptKey)) return activeDeptKey;
    return deptTabs[0].key;
  }, [deptTabs, activeDeptKey]);

  const switchTo = (key) => {
    const currentIdx = deptTabs.findIndex(t => t.key === resolvedKey);
    const nextIdx = deptTabs.findIndex(t => t.key === key);
    setAnimDir(nextIdx >= currentIdx ? 'right' : 'left');
    setActiveDeptKey(key);
    setSelectedNode(null);
    setFocusedTag(null);
  };

  const hideTab = (key) => {
    setHiddenDepts(prev => new Set([...prev, key]));
    // Auto-advance to next available tab
    const idx = deptTabs.findIndex(t => t.key === key);
    const next = deptTabs[idx + 1] || deptTabs[idx - 1];
    if (next) { setActiveDeptKey(next.key); }
    setSelectedNode(null);
  };

  const resetHidden = () => setHiddenDepts(new Set());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [treeRes, usersRes] = await Promise.all([
        axios.get(`${API_BASE}/insights/admin/template-tree`),
        axios.get(`${API_BASE}/insights/admin/users`)
      ]);
      setRawData(treeRes.data);
      setUsers(usersRes.data || []);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Update Template Backend Action
  const handleTemplateUpdate = async (templateId, fields) => {
    try {
      await axios.put(`${API_BASE}/insights/admin/template/${templateId}`, fields);
      setNotification({ type: 'success', message: 'Template configuration updated successfully' });

      // Update local state without doing a full fetch to preserve expansion states
      setRawData(prev => {
        if (!prev) return prev;

        // Find if template is being disconnected
        const isDisconnecting = fields.tag_id === null;
        let movedTemplate = null;

        // 1. Remove/update from departments structure
        const updatedDepts = prev.departments.map(dept => ({
          ...dept,
          tags: dept.tags.map(tag => {
            const index = tag.templates.findIndex(t => t.id === templateId);
            if (index !== -1) {
              const tmpl = tag.templates[index];
              const updatedTmpl = {
                ...tmpl,
                priority: fields.priority !== undefined ? fields.priority : tmpl.priority,
                ownerName: fields.owner_id !== undefined ? (users.find(u => u.id === parseInt(fields.owner_id))?.User?.name || null) : tmpl.ownerName,
                tag_id: fields.tag_id !== undefined ? fields.tag_id : tmpl.tag_id
              };
              movedTemplate = updatedTmpl;

              if (isDisconnecting || (fields.tag_id && fields.tag_id !== tag.id)) {
                // Remove from this tag
                return {
                  ...tag,
                  templates: tag.templates.filter(t => t.id !== templateId)
                };
              } else {
                // Update in place
                const nextTemplates = [...tag.templates];
                nextTemplates[index] = updatedTmpl;
                return { ...tag, templates: nextTemplates };
              }
            }
            return tag;
          })
        }));

        // 2. Remove/update from orphaned list
        let updatedOrphans = prev.orphanedTemplates.filter(t => t.id !== templateId);
        const orphanIndex = prev.orphanedTemplates.findIndex(t => t.id === templateId);
        if (orphanIndex !== -1) {
          const tmpl = prev.orphanedTemplates[orphanIndex];
          movedTemplate = {
            ...tmpl,
            priority: fields.priority !== undefined ? fields.priority : tmpl.priority,
            ownerName: fields.owner_id !== undefined ? (users.find(u => u.id === parseInt(fields.owner_id))?.User?.name || null) : tmpl.ownerName,
            tag_id: fields.tag_id !== undefined ? fields.tag_id : tmpl.tag_id
          };
          if (!isDisconnecting && fields.tag_id) {
            // It was connected to a tag! So we keep it out of orphans
          } else {
            // Keep in orphans, but updated
            updatedOrphans = [...updatedOrphans];
            updatedOrphans.push(movedTemplate);
          }
        }

        // 3. If template was connected to a new tag, insert it there
        if (fields.tag_id && movedTemplate) {
          updatedDepts.forEach(dept => {
            dept.tags.forEach(tag => {
              if (tag.id === fields.tag_id) {
                // Add if not already present
                if (!tag.templates.some(t => t.id === templateId)) {
                  tag.templates.push(movedTemplate);
                }
              }
            });
          });
        }

        // 4. If disconnected (tag_id === null), append to orphans
        if (isDisconnecting && movedTemplate) {
          if (!updatedOrphans.some(t => t.id === templateId)) {
            updatedOrphans.push(movedTemplate);
          }
        }

        // Recalculate stats
        const nextStats = {
          ...prev.stats,
          orphanedCount: updatedOrphans.length
        };

        const nextData = {
          ...prev,
          departments: updatedDepts,
          orphanedTemplates: updatedOrphans,
          stats: nextStats
        };

        return nextData;
      });
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to update template' });
    }
  };

  // Delete Tag Backend Action
  // When a tag is deleted, all its templates get disconnected (tag_id → null) and move to Unconnected area
  const handleTagDelete = async (tagId, tagName) => {
    if (!window.confirm(`Delete tag "${tagName}"?\n\nAll templates connected to this tag will be disconnected and will appear in the Unconnected area. This cannot be undone.`)) {
      return;
    }
    try {
      await axios.delete(`${API_BASE}/insights/admin/tag/${tagId}`);
      setNotification({ type: 'success', message: `Tag "${tagName}" deleted — its templates are now unconnected` });

      // Move all templates from this tag to orphanedTemplates in local state
      setRawData(prev => {
        if (!prev) return prev;
        let movedTemplates = [];
        const updatedDepts = prev.departments.map(dept => ({
          ...dept,
          tags: dept.tags.filter(tag => {
            if (tag.id !== tagId) return true;
            // Collect templates to move to orphaned
            movedTemplates = tag.templates.map(t => ({
              ...t,
              tag_id: null,
              tag_name: null,
              department: null,
              departmentLabel: 'Uncategorized'
            }));
            return false; // remove the tag
          })
        }));

        const updatedOrphans = [...prev.orphanedTemplates, ...movedTemplates];

        return {
          ...prev,
          departments: updatedDepts,
          orphanedTemplates: updatedOrphans,
          stats: {
            ...prev.stats,
            totalTags: prev.stats.totalTags - 1,
            orphanedCount: updatedOrphans.length
          }
        };
      });
      setSelectedNode(null);
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to delete tag' });
    }
  };

  // Update Tag Backend Action
  const handleTagUpdate = async (tagId, fields) => {
    try {
      await axios.put(`${API_BASE}/insights/admin/tag/${tagId}`, fields);
      setNotification({ type: 'success', message: 'Tag classification updated' });

      setRawData(prev => {
        if (!prev) return prev;
        const nextData = {
          ...prev,
          departments: prev.departments.map(dept => ({
            ...dept,
            tags: dept.tags.map(tag => {
              if (tag.id === tagId) {
                return {
                  ...tag,
                  tag_name: fields.tag_name || tag.tag_name,
                  recurrent: fields.recurrent || tag.recurrent
                };
              }
              return tag;
            })
          }))
        };
        return nextData;
      });
      return true;
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to update tag' });
      return false;
    }
  };

  // Create Tag Backend Action
  const handleTagCreate = async (fields) => {
    try {
      const res = await axios.post(`${API_BASE}/insights/admin/tag`, fields);
      setNotification({ type: 'success', message: `Tag "${fields.tag_name}" created successfully` });

      const newTagRecord = {
        id: res.data.tag.id,
        tag_name: res.data.tag.tag_name,
        description: res.data.tag.description,
        recurrent: res.data.tag.recurrent,
        templates: []
      };

      setRawData(prev => {
        if (!prev) return prev;
        const nextData = {
          ...prev,
          departments: prev.departments.map(dept => {
            if (dept.name === fields.user_position) {
              return {
                ...dept,
                tags: [...dept.tags, newTagRecord].sort((a, b) => a.tag_name.localeCompare(b.tag_name))
              };
            }
            return dept;
          }),
          stats: {
            ...prev.stats,
            totalTags: prev.stats.totalTags + 1
          }
        };
        return nextData;
      });
      return true;
    } catch (err) {
      setNotification({ type: 'error', message: err.response?.data?.error || 'Failed to create tag classification' });
      return false;
    }
  };

  // Gather flat list of all tags to populate movement dropdowns
  const allTagsList = rawData
    ? rawData.departments.flatMap(d => d.tags.map(t => ({ id: t.id, tag_name: `${d.label} - ${t.tag_name}` })))
    : [];

  const stats = rawData?.stats;

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <Notification notification={notification} onClose={() => setNotification(null)} />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2">
            <GitBranch size={20} className="text-accent" />
            Template <span className="text-accent">Console & Dashboard</span>
          </h2>
          <p className="text-xs text-text-muted mt-0.5">Manage checklist templates, assign owners, recurrence classifications, and departments</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 border border-glass-border rounded-xl text-xs font-bold text-text-muted hover:text-white transition-all cursor-pointer"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh Console
        </button>
      </div>

      {/* Stats bar */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <StatCard icon={<LayoutTemplate size={18} className="text-white" />} label="Total Templates" value={stats.totalTemplates} color="bg-primary/20 border border-primary/30" />
          <StatCard icon={<CheckCircle size={18} className="text-white" />} label="Connected" value={stats.connectedTemplates} color="bg-emerald-500/20 border border-emerald-500/30" />
          <StatCard icon={<AlertTriangle size={18} className="text-white" />} label="Unconnected" value={stats.orphanedCount} color="bg-red-500/20 border border-red-500/30" />
          <StatCard icon={<Tag size={18} className="text-white" />} label="Total Tags" value={stats.totalTags} color="bg-cyan-500/20 border border-cyan-500/30" />
          <StatCard icon={<Layers size={18} className="text-white" />} label="Active Depts" value={stats.activeDepts} color="bg-accent/20 border border-accent/30" />
        </div>
      )}

      {/* Controls: Tab switcher & Search */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex gap-2 p-1 bg-white/5 border border-glass-border rounded-2xl w-max">
          {[{ id: 'table', label: 'Interactive Console', icon: <List size={13} /> }, { id: 'graph', label: 'Tree Diagram', icon: <GitBranch size={13} /> }].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${activeTab === tab.id ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-text-muted hover:text-white hover:bg-white/5'}`}
            >
              {tab.icon}{tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative max-w-xs w-full">
          <input
            id="template-search-input"
            type="text"
            placeholder="Search templates or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2.5 text-xs font-bold text-white bg-white/5 hover:bg-white/8 focus:bg-white/10 border border-glass-border focus:border-primary/50 rounded-2xl outline-none transition-all placeholder:text-text-muted/70"
          />
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-text-muted">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-text-muted hover:text-white transition-all cursor-pointer"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Loading / error state */}
      {loading && (
        <div className="flex items-center justify-center py-20 text-text-muted gap-3">
          <RefreshCw size={18} className="animate-spin text-primary" />
          <span className="text-sm font-semibold">Syncing console data…</span>
        </div>
      )}
      {error && !loading && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center text-red-400 text-sm font-semibold">
          {error}
        </div>
      )}

      {/* EDITABLE BOARD VIEW */}
      {!loading && !error && rawData && activeTab === 'table' && (
        <div className="space-y-6">
          {/* Connected departments */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <CheckCircle size={15} className="text-emerald-400" />
                Department Classifications & Connected Templates
              </h3>
              <span className="text-[10px] text-text-muted font-bold flex items-center gap-1">
                <Info size={11} /> Inline changes sync to db automatically
              </span>
            </div>
            {filteredData.departments.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">No connected departments found.</p>
            ) : (
              filteredData.departments.map(dept => (
                <DeptRow
                  key={dept.name}
                  dept={dept}
                  users={users}
                  allTags={allTagsList}
                  allTemplates={allTemplatesList}
                  onTemplateUpdate={handleTemplateUpdate}
                  onTagDelete={handleTagDelete}
                  onTagUpdate={handleTagUpdate}
                  onTagCreate={handleTagCreate}
                />
              ))
            )}
          </div>

          {/* Unconnected templates */}
          {filteredData.orphanedTemplates.length > 0 && (
            <div className="bg-bg-card backdrop-blur-xl border border-red-500/20 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                <AlertTriangle size={15} className="text-red-400" />
                Unconnected Templates
                <span className="ml-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black">
                  {filteredData.orphanedTemplates.length}
                </span>
              </h3>
              <div className="divide-y divide-white/5 rounded-xl overflow-hidden border border-white/5 bg-red-500/2">
                {filteredData.orphanedTemplates.map(tmpl => (
                  <div key={tmpl.id} className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 px-4 py-3 hover:bg-white/2 transition-all">
                    <div className="flex items-center gap-2 min-w-0">
                      <AlertTriangle size={12} className="text-red-400 shrink-0" />
                      <span className="text-xs font-semibold text-white/90 truncate max-w-[250px]">{tmpl.template_name}</span>
                      <span className="text-[10px] text-text-muted uppercase bg-white/5 px-2 py-0.5 rounded-full">
                        {tmpl.departmentLabel}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 shrink-0">
                      {/* Priority selector */}
                      <PrioritySelector priority={tmpl.priority} onChange={(priority) => handleTemplateUpdate(tmpl.id, { priority })} />

                      {/* Connect to tag classification select */}
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-text-muted font-bold">Connect to tag:</span>
                        <select
                          onChange={(e) => {
                            if (e.target.value) {
                              handleTemplateUpdate(tmpl.id, { tag_id: parseInt(e.target.value) });
                            }
                          }}
                          className="bg-primary/20 border border-primary/30 rounded-lg px-2 py-1 text-[11px] font-bold text-white focus:outline-none focus:border-primary/50 cursor-pointer"
                          defaultValue=""
                        >
                          <option value="" disabled className="bg-[#0f172a] text-text-muted">-- Select classification tag --</option>
                          {allTagsList.map(tag => (
                            <option key={tag.id} value={tag.id} className="bg-[#0f172a]">{tag.tag_name}</option>
                          ))}
                        </select>
                      </div>

                      <span className="text-[10px] text-text-muted flex items-center gap-1"><Layers size={10} /> {tmpl.itemCount} items</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TREE GRAPH VIEW */}
      {!loading && !error && activeTab === 'graph' && (
        <div className="space-y-4 animate-fade-in">

          {/* Legend row + Reset Hidden */}
          <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl shadow-xl px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4">
              {[
                { label: 'Department', color: '#c084fc' },
                { label: 'Tag', color: '#fbbf24' },
                { label: 'Template', color: '#10b981' },
                { label: 'Unconnected', color: '#f43f5e' },
              ].map(({ label, color }) => (
                <div key={label} className="flex items-center gap-1.5 text-[11px] text-text-muted font-semibold">
                  <span className="w-3 h-3 rounded-sm" style={{ background: color, opacity: 0.85 }} />
                  {label}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden lg:flex items-center gap-1 text-[10px] text-text-muted bg-white/2 px-2 py-1 rounded-lg">
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

          {/* Pill tab-bar for department selection */}
          {deptTabs.length > 0 && (
            <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl shadow-xl px-5 py-3">
              <div className="text-[10px] font-black uppercase tracking-widest text-text-muted mb-2.5 px-1">Department</div>
              <div className="flex flex-wrap gap-2">
                {deptTabs.map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => switchTo(tab.key)}
                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${resolvedKey === tab.key
                        ? tab.isOrphan
                          ? 'bg-red-500 text-white border-red-500 shadow-lg shadow-red-500/30'
                          : 'bg-primary text-white border-primary shadow-lg shadow-primary/30'
                        : tab.isOrphan
                          ? 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20'
                          : 'bg-white/5 border-glass-border text-text-muted hover:text-white hover:bg-white/10'
                      }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Single active department tree */}
          {deptTabs.length === 0 ? (
            <div className="bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-16 text-center text-text-muted text-sm font-semibold">
              All departments are hidden. Click "Reset Hidden" to restore them.
            </div>
          ) : resolvedKey === '__ORPHAN__' ? (
            <OrphanedTreeCard
              key="__ORPHAN__"
              templates={filteredData.orphanedTemplates}
              nodePalette={nodePalette}
              animDir={animDir}
              onNodeClick={node => setSelectedNode(prev => prev?.name === node.name ? null : node)}
              onRemove={() => hideTab('__ORPHAN__')}
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
                onNodeClick={node => setSelectedNode(prev => prev?.name === node.name ? null : node)}
                onRemove={() => hideTab(dept.name)}
                graphViewMode={graphViewMode}
                setGraphViewMode={setGraphViewMode}
                focusedTag={focusedTag}
                setFocusedTag={setFocusedTag}
              />
            );
          })()}
        </div>
      )}

      {/* Node detail side panel */}
      {selectedNode && (
        <NodeDetailPanel
          node={selectedNode}
          onClose={() => setSelectedNode(null)}
          onDisconnectTemplate={(id) => handleTemplateUpdate(id, { tag_id: null })}
        />
      )}
    </div>
  );
}
