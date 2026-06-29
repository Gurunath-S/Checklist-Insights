import React, { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import Tree from 'react-d3-tree';
import {
  LayoutTemplate, Tag, Users, AlertTriangle, CheckCircle,
  ChevronDown, ChevronRight, Info, GitBranch, List,
  RefreshCw, Layers, Shield, Repeat, Clock, Edit2,
  Check, X, Plus, Trash2, Link, Unlink, UserPlus, Save
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
    cardBg:      isLight ? 'rgba(248,250,252,0.97)'  : 'rgba(15,23,42,0.95)',
    cardBgRoot:  isLight ? 'rgba(238,240,255,0.97)'  : 'rgba(30,27,75,0.97)',
    cardBgOrphan:isLight ? 'rgba(255,241,242,0.97)'  : 'rgba(28,10,10,0.97)',
    shadowFill:  isLight ? 'rgba(0,0,0,0.06)'        : 'rgba(0,0,0,0.35)',
    textMain:    isLight ? '#0f172a'                  : '#ffffff',
    textMuted:   isLight ? '#475569'                  : '#94a3b8',
    textSub:     isLight ? '#64748b'                  : '#cbd5e1',
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
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl animate-in fade-in slide-in-from-top duration-300 ${
      notification.type === 'success'
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
const DeptRow = ({ dept, users, allTags, onTemplateUpdate, onTagUpdate, onTagCreate }) => {
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
              onTemplateUpdate={onTemplateUpdate}
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
const TagSection = ({ tag, users, allTags, onTemplateUpdate, onTagUpdate }) => {
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

  return (
    <div className="border border-white/5 rounded-xl overflow-hidden bg-[#0f172a]/20">
      <div className="flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-all">
        {isEditing ? (
          <div className="flex items-center gap-2 flex-wrap">
            <input
              type="text"
              value={tagName}
              onChange={(e) => setTagName(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-0.5 text-xs text-white focus:outline-none focus:border-primary/50"
            />
            <RecurrenceSelector recurrent={tagRecurrent} onChange={setTagRecurrent} />
            <button onClick={handleSaveTag} disabled={saving} className="p-1 bg-emerald-500/20 text-emerald-400 rounded hover:bg-emerald-500/30 transition-all cursor-pointer">
              <Check size={13} />
            </button>
            <button onClick={() => { setIsEditing(false); setTagName(tag.tag_name); setTagRecurrent(tag.recurrent); }} className="p-1 bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-all cursor-pointer">
              <X size={13} />
            </button>
          </div>
        ) : (
          <button
            onClick={() => setOpen(o => !o)}
            className="flex items-center gap-2 text-left cursor-pointer min-w-0"
          >
            {open ? <ChevronDown size={13} className="text-accent shrink-0" /> : <ChevronRight size={13} className="text-text-muted shrink-0" />}
            <Tag size={13} className="text-accent shrink-0" />
            <span className="text-xs font-bold text-white/90 truncate">{tag.tag_name}</span>
            {tag.recurrent && tag.recurrent !== 'None' && (
              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Repeat size={8} /> {tag.recurrent}
              </span>
            )}
          </button>
        )}

        <div className="flex items-center gap-3">
          <span className="text-[10px] text-text-muted">{tag.templates.length} templates</span>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="p-1 bg-white/5 hover:bg-white/10 text-text-muted hover:text-white rounded transition-all cursor-pointer"
              title="Edit Tag classification"
            >
              <Edit2 size={11} />
            </button>
          )}
        </div>
      </div>

      {open && (
        <div className="divide-y divide-white/5 border-t border-white/5 bg-[#0f172a]/40">
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

        {/* Disconnect Action */}
        <button
          onClick={() => handleUpdate({ tag_id: null })}
          className="flex items-center gap-1 px-2.5 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] font-bold transition-all cursor-pointer"
          title="Disconnect from tag classification (makes it unconnected)"
        >
          <Unlink size={10} /> Disconnect
        </button>
      </div>
    </div>
  );
};

// ── Department Tree Component ───────────────────────────────────────────────
const DepartmentTreeCard = ({ dept, nodePalette, onNodeClick, onRemove, animDir }) => {
  const treeData = React.useMemo(() => ({
    name: dept.label,
    attributes: { type: 'department', dept: dept.name },
    children: dept.tags.map(tag => ({
      name: tag.tag_name,
      attributes: { type: 'tag', recurrent: tag.recurrent },
      children: tag.templates.map(tmpl => ({
        name: tmpl.template_name,
        attributes: {
          type: 'template',
          priority: tmpl.priority,
          recipients: String(tmpl.recipientCount),
          items: String(tmpl.itemCount),
          owner: tmpl.ownerName || ''
        }
      }))
    }))
  }), [dept]);

  const totalTemplates = React.useMemo(() =>
    dept.tags.reduce((sum, t) => sum + t.templates.length, 0),
    [dept]
  );

  const slideAnim = animDir === 'right'
    ? 'translateX(0) opacity: 1'
    : 'translateX(0) opacity: 1';

  const animClass = animDir === 'right'
    ? 'animate-slide-in-right'
    : 'animate-slide-in-left';

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
            {dept.label} Hierarchy
          </h4>
          <p className="text-[11px] text-text-muted mt-0.5">
            {dept.tags.length} Tag Classifications · {totalTemplates} Connected Templates
          </p>
        </div>
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

      <div className="h-[480px] w-full bg-white/1 border border-white/5 rounded-2xl overflow-hidden relative">
        <Tree
          data={treeData}
          translate={{ x: 160, y: 240 }}
          orientation="horizontal"
          pathFunc="elbow"
          nodeSize={{ x: 300, y: 120 }}
          separation={{ siblings: 1.15, nonSiblings: 1.4 }}
          collapsible
          initialDepth={2}
          zoomable
          draggable
          zoom={0.7}
          renderCustomNodeElement={rd3tProps => (
            <CustomNode
              nodeDatum={rd3tProps.nodeDatum}
              palette={nodePalette}
              onNodeClick={onNodeClick}
            />
          )}
          pathClassFunc={() => 'tree-link-path'}
          svgClassName="template-tree-svg"
        />
      </div>
    </div>
  );
};

// ── Orphaned Templates Tree Component ────────────────────────────────────────
const OrphanedTreeCard = ({ templates, nodePalette, onNodeClick, onRemove, animDir }) => {
  const treeData = React.useMemo(() => ({
    name: 'Unconnected Templates',
    attributes: { type: 'orphan-root' },
    children: templates.map(tmpl => ({
      name: tmpl.template_name,
      attributes: {
        type: 'orphan',
        priority: tmpl.priority,
        dept: tmpl.departmentLabel || 'Uncategorized',
        recipients: String(tmpl.recipientCount),
        items: String(tmpl.itemCount),
        owner: tmpl.ownerName || ''
      }
    }))
  }), [templates]);

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

      <div className="h-[480px] w-full bg-red-500/2 border border-red-500/10 rounded-2xl overflow-hidden relative">
        <Tree
          data={treeData}
          translate={{ x: 160, y: 240 }}
          orientation="horizontal"
          pathFunc="elbow"
          nodeSize={{ x: 300, y: 120 }}
          separation={{ siblings: 1.15, nonSiblings: 1.4 }}
          collapsible
          initialDepth={2}
          zoomable
          draggable
          zoom={0.7}
          renderCustomNodeElement={rd3tProps => (
            <CustomNode
              nodeDatum={rd3tProps.nodeDatum}
              palette={nodePalette}
              onNodeClick={onNodeClick}
            />
          )}
          pathClassFunc={() => 'tree-link-path'}
          svgClassName="template-tree-svg"
        />
      </div>
    </div>
  );
};

// ── Custom node renderer for react-d3-tree ────────────────────────────────────
const CustomNode = ({ nodeDatum, onNodeClick, palette }) => {
  const t = nodeDatum.attributes?.type;
  const isRoot      = t === 'root';
  const isDept      = t === 'department';
  const isTag       = t === 'tag';
  const isTemplate  = t === 'template';
  const isOrphan    = t === 'orphan';
  const isOrphanRoot= t === 'orphan-root';

  const p = palette || getNodePalette('classic');

  // Node card size
  const width = 240;
  const height = 84;
  const halfW = width / 2;
  const halfH = height / 2;

  // Theme-aware fills & strokes
  let fill, stroke, accentColor, subTextFill;

  if (isRoot)        { fill = p.cardBgRoot;   stroke = cssVar('--color-primary'); accentColor = cssVar('--color-primary'); }
  else if (isDept)   { fill = p.cardBg;       stroke = cssVar('--color-accent');  accentColor = cssVar('--color-accent'); }
  else if (isTag)    { fill = p.cardBg;       stroke = '#22d3ee';                 accentColor = '#22d3ee'; }
  else if (isTemplate){ fill = p.cardBg;      stroke = '#10b981';                 accentColor = '#34d399'; }
  else if (isOrphanRoot){ fill = p.cardBgOrphan; stroke = '#f43f5e';              accentColor = '#fda4af'; }
  else               { fill = p.cardBgOrphan; stroke = '#f43f5e';                 accentColor = '#fda4af'; }

  subTextFill = p.textMuted;

  // Truncate label
  const nameLimit = isRoot ? 28 : 24;
  const displayName = nodeDatum.name.length > nameLimit
    ? nodeDatum.name.slice(0, nameLimit - 2) + '…'
    : nodeDatum.name;

  const priority = nodeDatum.attributes?.priority;
  const priorityColor = { HIGH: '#f87171', MEDIUM: '#fbbf24', LOW: '#34d399' }[priority] || null;

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
          style={{ fontSize: '9.5px', fill: cssVar('--color-accent'), fontFamily: 'Outfit, Inter, sans-serif',
            fontWeight: '700', letterSpacing: '0.04em' }}>
          DEPARTMENT
        </text>
      )}

      {isTag && (
        <g>
          <text x={-halfW + 16} y={-halfH + 49} textAnchor="start"
            style={{ fontSize: '10px', fill: '#22d3ee', fontFamily: 'Outfit, Inter, sans-serif', fontWeight: '700' }}>
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
          <text x={-halfW + 16} y={-halfH + 49} textAnchor="start"
            style={{ fontSize: '10px', fill: p.textSub, fontFamily: 'Outfit, Inter, sans-serif', fontWeight: '700' }}>
            {nodeDatum.attributes?.items || '0'} Items · {nodeDatum.attributes?.recipients || '0'} Recipients
          </text>
          <text x={-halfW + 16} y={-halfH + 64} textAnchor="start"
            style={{
              fontSize: '9.5px',
              fill: nodeDatum.attributes?.owner ? '#34d399' : '#f87171',
              fontFamily: 'Outfit, Inter, sans-serif',
              fontWeight: '600'
            }}>
            {nodeDatum.attributes?.owner ? `Owner: ${nodeDatum.attributes.owner}` : 'No Owner Assigned'}
          </text>
        </g>
      )}

      {isOrphanRoot && (
        <text x={-halfW + 16} y={-halfH + 50} textAnchor="start"
          style={{ fontSize: '9.5px', fill: '#f43f5e', fontFamily: 'Outfit, Inter, sans-serif',
            fontWeight: '700', letterSpacing: '0.04em' }}>
          UNCONNECTED TEMPLATES
        </text>
      )}
    </g>
  );
};

// ── Node detail side panel ────────────────────────────────────────────────────
const NodeDetailPanel = ({ node, onClose }) => {
  if (!node) return null;
  const t = node.attributes?.type;
  return (
    <div className="fixed inset-y-0 right-0 w-80 bg-bg-card border-l border-glass-border shadow-2xl z-50 p-6 overflow-y-auto animate-in slide-in-from-right duration-300">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-base font-black text-text-main truncate pr-4">{node.name}</h3>
        <button onClick={onClose} className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-text-muted hover:text-text-main transition-all cursor-pointer shrink-0">✕</button>
      </div>
      <div className="space-y-3">
        {Object.entries(node.attributes || {}).filter(([k]) => k !== 'type').map(([k, v]) => (
          <div key={k} className="flex justify-between items-center py-2 border-b border-glass-border">
            <span className="text-xs text-text-muted capitalize font-semibold">{k}</span>
            <span className="text-xs font-bold text-text-main">{v}</span>
          </div>
        ))}
        {t === 'template' && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-[11px] text-emerald-400 font-bold">
              {node.attributes?.recipients > 0 ? '✓ Connected — has recipients assigned' : '⚠ No recipients assigned (orphaned)'}
            </p>
          </div>
        )}
        {t === 'orphan' && (
          <div className="mt-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-[11px] text-red-400 font-bold">⚠ No recipients assigned to this template.</p>
          </div>
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
  const [rawData, setRawData]           = useState(null);
  const [users, setUsers]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [activeTab, setActiveTab]       = useState('table'); // 'table' | 'graph'
  const [activeDeptKey, setActiveDeptKey] = useState(null);  // null = use first available
  const [hiddenDepts, setHiddenDepts]   = useState(new Set());
  const [animDir, setAnimDir]           = useState('right');
  const [selectedNode, setSelectedNode] = useState(null);
  const [notification, setNotification] = useState(null);

  // Compute theme palette whenever theme changes
  const nodePalette = React.useMemo(() => getNodePalette(theme), [theme]);

  // Build the ordered tab list: visible depts + orphan tab if applicable
  const deptTabs = React.useMemo(() => {
    if (!rawData) return [];
    const tabs = rawData.departments
      .filter(d => !hiddenDepts.has(d.name))
      .map(d => ({ key: d.name, label: d.label, isOrphan: false }));
    if (rawData.orphanedTemplates.length > 0 && !hiddenDepts.has('__ORPHAN__')) {
      tabs.push({ key: '__ORPHAN__', label: 'Unconnected', isOrphan: true });
    }
    return tabs;
  }, [rawData, hiddenDepts]);

  // Keep activeDeptKey valid when tabs change
  const resolvedKey = React.useMemo(() => {
    if (!deptTabs.length) return null;
    if (deptTabs.some(t => t.key === activeDeptKey)) return activeDeptKey;
    return deptTabs[0].key;
  }, [deptTabs, activeDeptKey]);

  const switchTo = (key) => {
    const currentIdx = deptTabs.findIndex(t => t.key === resolvedKey);
    const nextIdx    = deptTabs.findIndex(t => t.key === key);
    setAnimDir(nextIdx >= currentIdx ? 'right' : 'left');
    setActiveDeptKey(key);
    setSelectedNode(null);
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

      {/* Tab switcher */}
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
            {rawData.departments.length === 0 ? (
              <p className="text-xs text-text-muted text-center py-8">No connected departments found.</p>
            ) : (
              rawData.departments.map(dept => (
                <DeptRow
                  key={dept.name}
                  dept={dept}
                  users={users}
                  allTags={allTagsList}
                  onTemplateUpdate={handleTemplateUpdate}
                  onTagUpdate={handleTagUpdate}
                  onTagCreate={handleTagCreate}
                />
              ))
            )}
          </div>

          {/* Unconnected templates */}
          {rawData.orphanedTemplates.length > 0 && (
            <div className="bg-bg-card backdrop-blur-xl border border-red-500/20 rounded-3xl p-6 shadow-xl">
              <h3 className="text-sm font-black text-white mb-4 flex items-center gap-2">
                <AlertTriangle size={15} className="text-red-400" />
                Unconnected Templates
                <span className="ml-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] font-black">
                  {rawData.orphanedTemplates.length}
                </span>
              </h3>
              <div className="divide-y divide-white/5 rounded-xl overflow-hidden border border-white/5 bg-red-500/2">
                {rawData.orphanedTemplates.map(tmpl => (
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
                { label: 'Tag',        color: '#22d3ee' },
                { label: 'Template',   color: '#10b981' },
                { label: 'Unconnected',color: '#f43f5e' },
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
                    className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all border cursor-pointer ${
                      resolvedKey === tab.key
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
              templates={rawData.orphanedTemplates}
              nodePalette={nodePalette}
              animDir={animDir}
              onNodeClick={node => setSelectedNode(prev => prev?.name === node.name ? null : node)}
              onRemove={() => hideTab('__ORPHAN__')}
            />
          ) : (() => {
            const dept = rawData.departments.find(d => d.name === resolvedKey);
            if (!dept) return null;
            return (
              <DepartmentTreeCard
                key={dept.name}
                dept={dept}
                nodePalette={nodePalette}
                animDir={animDir}
                onNodeClick={node => setSelectedNode(prev => prev?.name === node.name ? null : node)}
                onRemove={() => hideTab(dept.name)}
              />
            );
          })()}
        </div>
      )}

      {/* Node detail side panel */}
      {selectedNode && (
        <NodeDetailPanel node={selectedNode} onClose={() => setSelectedNode(null)} />
      )}
    </div>
  );
}
