import React, { useState, useEffect, useCallback, useRef } from 'react';
import { 
  getTemplateTreeApi, 
  getAdminUsersApi, 
  updateTemplateApi, 
  deleteTemplateTagApi, 
  updateTemplateTagApi, 
  createTemplateTagApi 
} from '../services/adminService';
import {
  LayoutTemplate, Tag, Users, AlertTriangle, CheckCircle,
  ChevronDown, ChevronRight, Info, GitBranch, List,
  RefreshCw, Layers, Shield, Repeat, Clock, Edit2,
  Check, X, Plus, Minus, Maximize2, Trash2, Link, Unlink, UserPlus, Save
} from 'lucide-react';
import { useThemeStore } from '../../../store/useThemeStore';
const KPINetworkView = React.lazy(() => import('../../kpi-network/components/KPINetworkView'));
import TemplateTreeGraphView from './TemplateTreeGraphView';

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



// ── Main Dashboard Component ──────────────────────────────────────────────────
export default function TemplateDashboard() {
  const { theme } = useThemeStore();
  const [rawData, setRawData] = useState(null);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('table'); // 'table' | 'graph' | 'kpi-network'
  const [selectedNode, setSelectedNode] = useState(null);
  const [notification, setNotification] = useState(null);
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



  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [treeData, usersData] = await Promise.all([
        getTemplateTreeApi(),
        getAdminUsersApi()
      ]);
      setRawData(treeData);
      setUsers(usersData || []);
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
      await updateTemplateApi(templateId, fields);
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
      await deleteTemplateTagApi(tagId);
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
      await updateTemplateTagApi(tagId, fields);
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
      const resData = await createTemplateTagApi(fields);
      setNotification({ type: 'success', message: `Tag "${fields.tag_name}" created successfully` });

      const newTagRecord = {
        id: resData.tag.id,
        tag_name: resData.tag.tag_name,
        description: resData.tag.description,
        recurrent: resData.tag.recurrent,
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
          {[
            { id: 'table', label: 'Interactive Console', icon: <List size={13} /> },
            { id: 'graph', label: 'Tree Diagram', icon: <GitBranch size={13} /> },
            { id: 'kpi-network', label: 'KPI Network', icon: <Link size={13} /> }
          ].map(tab => (
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
        <TemplateTreeGraphView
          filteredData={filteredData}
          theme={theme}
          onNodeClick={node => setSelectedNode(prev => prev?.name === node.name ? null : node)}
        />
      )}

      {/* KPI NETWORK VIEW */}
      {!loading && !error && activeTab === 'kpi-network' && (
        <React.Suspense fallback={<div className="flex items-center justify-center p-12 text-xs font-bold text-text-muted">Loading KPI Network...</div>}>
          <KPINetworkView />
        </React.Suspense>
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
