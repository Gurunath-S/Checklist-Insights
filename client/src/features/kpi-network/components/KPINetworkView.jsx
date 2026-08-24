import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Search, Link2, Unlink, Activity, Calendar, HelpCircle,
  Plus, Minus, Maximize2, Trash2, ArrowUp, ArrowDown, Save, RefreshCw
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip
} from 'recharts';
import { useThemeStore } from '../../../store/useThemeStore';
import {
  getKPINetworkApi,
  getItemAnalyticsApi,
  updateItemConfigApi,
  createKPINetworkLinkApi,
  deleteKPINetworkLinkApi
} from '../services/kpiNetworkService';

export default function KPINetworkView() {
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  // API State
  const [items, setItems] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Trend Analytics State
  const [selectedItemTrend, setSelectedItemTrend] = useState([]);
  const [selectedItemTrendLoading, setSelectedItemTrendLoading] = useState(false);
  const [selectedItemTrendError, setSelectedItemTrendError] = useState(null);
  const [currentAggregation, setCurrentAggregation] = useState('Monthly');
  const [savingPreference, setSavingPreference] = useState(false);

  // UI State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState(null);
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [isLinking, setIsLinking] = useState(false);
  const [linkParentId, setLinkParentId] = useState('');
  const [linkChildId, setLinkChildId] = useState('');
  const [savingLink, setSavingLink] = useState(false);
  const [notification, setNotification] = useState(null);

  // SVG Pan/Zoom State
  const svgRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const dragging = useRef(false);
  const lastPos = useRef({ x: 0, y: 0 });

  // Fetch KPI Network Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getKPINetworkApi();
      setItems(data.items || []);
      setRelationships(data.relationships || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching KPI network data:', err);
      setError(err.response?.data?.error || 'Failed to fetch KPI network data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Fetch Trend Analytics for the Selected Item
  useEffect(() => {
    if (!selectedNodeId) {
      setSelectedItemTrend([]);
      return;
    }

    const fetchTrendData = async () => {
      try {
        setSelectedItemTrendLoading(true);
        setSelectedItemTrendError(null);
        const data = await getItemAnalyticsApi(selectedNodeId, { aggregation: currentAggregation });
        setSelectedItemTrend(data.trend || []);
      } catch (err) {
        console.error('Error fetching trend analytics:', err);
        setSelectedItemTrendError(err.response?.data?.error || 'Failed to fetch trend data');
      } finally {
        setSelectedItemTrendLoading(false);
      }
    };

    fetchTrendData();
  }, [selectedNodeId, currentAggregation]);

  const handleSelectNode = (nodeId) => {
    setSelectedNodeId(nodeId);
    if (nodeId) {
      const node = items.find(i => i.id === nodeId);
      if (node) {
        setCurrentAggregation(node.aggregation || 'Monthly');
      }
    } else {
      setSelectedItemTrend([]);
      setSelectedItemTrendError(null);
    }
  };

  const handleUpdatePreferredAggregation = async (newAggregation) => {
    if (!selectedNodeId) return;
    try {
      setSavingPreference(true);
      await updateItemConfigApi(selectedNodeId, {
        aggregation: newAggregation
      });
      triggerNotification('Preferred granularity updated successfully.');
      
      // Update the items array locally
      setItems(prevItems => prevItems.map(item => 
        item.id === selectedNodeId ? { ...item, aggregation: newAggregation } : item
      ));
      
      // Keep the current override view synced with the new preferred granularity
      setCurrentAggregation(newAggregation);
    } catch (err) {
      console.error('Error updating aggregation preference:', err);
      triggerNotification('Failed to update preferred granularity.', 'error');
    } finally {
      setSavingPreference(false);
    }
  };

  // Show auto-dismiss notification
  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Find the selected item
  const selectedItem = useMemo(() => {
    return items.find(item => item.id === selectedNodeId);
  }, [items, selectedNodeId]);

  // Filtered items list for the left panel search
  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return items;
    const term = searchTerm.toLowerCase();
    return items.filter(item =>
      item.checklist_name.toLowerCase().includes(term) ||
      item.input_type.toLowerCase().includes(term)
    );
  }, [items, searchTerm]);

  // Compute Layout for SVG
  const graphNodes = useMemo(() => {
    if (items.length === 0) return [];

    // Focus View: If a node is selected, show it + direct parents + direct children
    if (selectedNodeId) {
      const selected = items.find(i => i.id === selectedNodeId);
      if (!selected) return [];

      const nodeMap = new Map();
      
      // 1. Center node (Selected)
      nodeMap.set(selected.id, {
        ...selected,
        x: 0,
        y: 0,
        tier: 'center',
        isFocused: true
      });

      // 2. Parent tier (Above)
      const parentIds = selected.parent_ids || [];
      const numParents = parentIds.length;
      parentIds.forEach((pId, idx) => {
        const pNode = items.find(i => i.id === pId);
        if (pNode) {
          const xOffset = numParents > 1 ? (idx - (numParents - 1) / 2) * 260 : 0;
          nodeMap.set(pId, {
            ...pNode,
            x: xOffset,
            y: -180,
            tier: 'parent'
          });
        }
      });

      // 3. Child tier (Below)
      const childIds = selected.child_ids || [];
      const numChildren = childIds.length;
      childIds.forEach((cId, idx) => {
        const cNode = items.find(i => i.id === cId);
        if (cNode) {
          const xOffset = numChildren > 1 ? (idx - (numChildren - 1) / 2) * 260 : 0;
          nodeMap.set(cId, {
            ...cNode,
            x: xOffset,
            y: 180,
            tier: 'child'
          });
        }
      });

      return Array.from(nodeMap.values());
    }

    // Global View: Display all connected nodes, filter out orphans
    const connected = items.filter(item => 
      (item.parent_ids && item.parent_ids.length > 0) || 
      (item.child_ids && item.child_ids.length > 0)
    );

    if (connected.length === 0) return [];

    // Compute levels using simple topological layers
    const levels = {};
    const getLevel = (id, visited = new Set()) => {
      if (id in levels) return levels[id];
      if (visited.has(id)) return 0;
      visited.add(id);

      const node = items.find(i => i.id === id);
      if (!node || !node.parent_ids || node.parent_ids.length === 0) {
        levels[id] = 0;
        return 0;
      }

      let maxParentLevel = -1;
      node.parent_ids.forEach(pId => {
        maxParentLevel = Math.max(maxParentLevel, getLevel(pId, visited));
      });

      levels[id] = maxParentLevel + 1;
      return levels[id];
    };

    connected.forEach(node => getLevel(node.id));

    // Group nodes by level
    const nodesByLevel = {};
    connected.forEach(node => {
      const lvl = levels[node.id] || 0;
      if (!nodesByLevel[lvl]) nodesByLevel[lvl] = [];
      nodesByLevel[lvl].push(node);
    });

    const outputNodes = [];
    const levelSpacingY = 180;
    const nodeSpacingX = 260;

    Object.keys(nodesByLevel).forEach(lvlKey => {
      const lvl = parseInt(lvlKey);
      const lvlNodes = nodesByLevel[lvl];
      const count = lvlNodes.length;
      lvlNodes.forEach((node, idx) => {
        const xOffset = (idx - (count - 1) / 2) * nodeSpacingX;
        outputNodes.push({
          ...node,
          x: xOffset,
          y: (lvl - 1) * levelSpacingY, // Center Level 1 at y = 0
          level: lvl
        });
      });
    });

    return outputNodes;
  }, [items, selectedNodeId]);

  // Compute edges to render
  const graphEdges = useMemo(() => {
    const activeNodeIds = new Set(graphNodes.map(n => n.id));
    const edges = [];

    relationships.forEach(rel => {
      // Only render relationships where both parent and child are currently visible
      if (activeNodeIds.has(rel.parent_item_id) && activeNodeIds.has(rel.child_item_id)) {
        const parentNode = graphNodes.find(n => n.id === rel.parent_item_id);
        const childNode = graphNodes.find(n => n.id === rel.child_item_id);
        if (parentNode && childNode) {
          edges.push({
            id: rel.id,
            parent: parentNode,
            child: childNode
          });
        }
      }
    });

    return edges;
  }, [relationships, graphNodes]);

  // Create path from parent edge to child edge
  const makeEdgePath = (parent, child) => {
    const sx = parent.x;
    const sy = parent.y + 35; // offset from card center (node height is ~70)
    const ex = child.x;
    const ey = child.y - 35;
    const cp1x = sx;
    const cp1y = sy + (ey - sy) * 0.45;
    const cp2x = ex;
    const cp2y = sy + (ey - sy) * 0.55;
    return `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${ex} ${ey}`;
  };

  // SVGPanning & Zooming handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.node-element')) return; // ignore drags on actual nodes
    dragging.current = true;
    lastPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e) => {
    if (!dragging.current) return;
    const dx = e.clientX - lastPos.current.x;
    const dy = e.clientY - lastPos.current.y;
    lastPos.current = { x: e.clientX, y: e.clientY };
    setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
  };

  const handleMouseUp = () => {
    dragging.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(t => ({
      ...t,
      scale: Math.min(2, Math.max(0.3, t.scale * factor))
    }));
  };

  const zoomIn = () => setTransform(t => ({ ...t, scale: Math.min(2, t.scale * 1.2) }));
  const zoomOut = () => setTransform(t => ({ ...t, scale: Math.max(0.3, t.scale / 1.2) }));
  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 });

  // Handle Link Creation
  const handleCreateLink = async (e) => {
    e.preventDefault();
    if (!linkParentId || !linkChildId) return;
    try {
      setSavingLink(true);
      await createKPINetworkLinkApi({
        parent_item_id: parseInt(linkParentId),
        child_item_id: parseInt(linkChildId)
      });
      triggerNotification('Relationship linked successfully!');
      setLinkParentId('');
      setLinkChildId('');
      setIsLinking(false);
      fetchData();
    } catch (err) {
      console.error(err);
      triggerNotification(err.response?.data?.error || 'Failed to create link', 'error');
    } finally {
      setSavingLink(false);
    }
  };

  // Handle Link Deletion
  const handleDeleteLink = async (linkId) => {
    if (!window.confirm('Are you sure you want to remove this connection?')) return;
    try {
      await deleteKPINetworkLinkApi(linkId);
      triggerNotification('Relationship removed successfully.');
      fetchData();
    } catch (err) {
      console.error(err);
      triggerNotification('Failed to remove link.', 'error');
    }
  };

  // Node Color Schemes
  const getNodeStyles = (node) => {
    const isFocused = node.id === selectedNodeId;
    const isHovered = node.id === hoveredNodeId;

    let border = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';
    let borderActive = 'var(--primary-color, #6366f1)';
    let bg = isLight ? 'rgba(248, 250, 252, 0.95)' : 'rgba(15, 23, 42, 0.95)';

    if (node.id === selectedNodeId) {
      border = borderActive;
    } else if (isHovered) {
      border = isLight ? 'rgba(99, 102, 241, 0.6)' : 'rgba(99, 102, 241, 0.8)';
    }

    return { bg, border, isFocused, isHovered };
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-190px)] min-h-[500px]">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl animate-in fade-in slide-in-from-top duration-300 ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-red-500/10 border-red-500/30 text-red-400'
        }`}>
          <span className="text-xs font-bold">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-current hover:opacity-80 font-black">✕</button>
        </div>
      )}

      {/* Left Panel: Search & List */}
      <div className="w-full lg:w-80 bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-5 flex flex-col shadow-xl shrink-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-black text-white flex items-center gap-2">
            <Activity size={15} className="text-primary" />
            Checklist KPI Items
          </h3>
          <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-full text-text-muted font-bold">
            {items.length} total
          </span>
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <input
            type="text"
            placeholder="Search checklist items..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 text-xs font-bold text-white bg-white/5 hover:bg-white/8 focus:bg-white/10 border border-glass-border focus:border-primary/50 rounded-2xl outline-none transition-all placeholder:text-text-muted/65"
          />
          <Search size={13} className="absolute left-3.5 top-3 text-text-muted" />
          {searchTerm && (
            <button onClick={() => setSearchTerm('')} className="absolute right-3 top-2.5 text-text-muted hover:text-white">✕</button>
          )}
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-text-muted">
              <RefreshCw size={14} className="animate-spin text-primary" />
              <span className="text-xs font-semibold">Loading items...</span>
            </div>
          ) : filteredItems.length === 0 ? (
            <p className="text-xs text-text-muted text-center py-8">No items match your search.</p>
          ) : (
            filteredItems.map(item => {
              const isSelected = item.id === selectedNodeId;
              const hasRelations = (item.parent_ids?.length || 0) + (item.child_ids?.length || 0) > 0;
              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectNode(isSelected ? null : item.id)}
                  className={`w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-1.5 cursor-pointer ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-white'
                      : 'bg-white/2 hover:bg-white/5 border-white/5 hover:border-white/10 text-text-muted hover:text-white'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs font-bold line-clamp-2">{item.checklist_name}</span>
                    {hasRelations && (
                      <span className="shrink-0 text-[8px] font-black uppercase tracking-wider bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 px-1.5 py-0.5 rounded">
                        Linked
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-[9px] font-semibold text-text-sub">
                    <span>Type: {item.input_type}</span>
                    <span className="bg-white/5 px-1.5 py-0.5 rounded">
                      {item.avg_value !== null 
                        ? `${item.avg_value}${item.input_type === 'Boolean' ? '%' : ''} avg`
                        : 'No responses'
                      }
                    </span>
                  </div>
                </button>
              );
            })
          )}
        </div>

        {/* Link creation button */}
        <button
          onClick={() => setIsLinking(true)}
          className="mt-4 w-full flex items-center justify-center gap-1.5 py-2.5 bg-primary hover:bg-primary/90 text-white text-xs font-bold rounded-2xl shadow-lg shadow-primary/25 transition-all cursor-pointer"
        >
          <Link2 size={13} /> Link KPI Relationships
        </button>
      </div>

      {/* Center Panel: SVG Canvas & Details */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 relative">

        {/* SVG Canvas Container */}
        <div className="flex-1 bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl relative overflow-hidden shadow-xl min-h-[350px]">
          
          {/* Legend / Info bar */}
          <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-none">
            <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-text-muted flex items-center gap-2 pointer-events-auto">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-indigo-500" /> Parent / root</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-emerald-500" /> Target item</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded bg-amber-500" /> Child / leaf</span>
            </div>
            {selectedNodeId && (
              <button 
                onClick={() => handleSelectNode(null)}
                className="bg-slate-900/60 hover:bg-slate-900/80 backdrop-blur-md border border-white/5 px-3 py-1.5 rounded-xl text-[10px] font-bold text-primary hover:text-white transition-all pointer-events-auto cursor-pointer"
              >
                Clear Focus View
              </button>
            )}
          </div>

          {/* SVG Canvas */}
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{ 
              cursor: dragging.current ? 'grabbing' : 'grab',
              userSelect: 'none',
              background: isLight ? '#f8fafc' : '#090d16'
            }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <g transform={`translate(${transform.x + 350}, ${transform.y + 200}) scale(${transform.scale})`}>
              
              {/* Relationship paths */}
              {graphEdges.map(edge => {
                const isHovered = edge.parent.id === hoveredNodeId || edge.child.id === hoveredNodeId;
                return (
                  <g key={edge.id}>
                    <path
                      d={makeEdgePath(edge.parent, edge.child)}
                      fill="none"
                      stroke={isHovered ? 'var(--primary-color, #6366f1)' : (isLight ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.15)')}
                      strokeWidth={isHovered ? 2 : 1.2}
                      strokeDasharray="4,4"
                      className="transition-all duration-200"
                    />
                    {/* Delete Link Trigger directly on edge */}
                    <circle
                      cx={(edge.parent.x + edge.child.x) / 2}
                      cy={(edge.parent.y + edge.child.y) / 2}
                      r={7}
                      fill={isLight ? '#ffffff' : '#1e293b'}
                      stroke={isHovered ? '#ef4444' : (isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)')}
                      strokeWidth={1}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLink(edge.id);
                      }}
                      title="Remove this relationship"
                    />
                    <text
                      x={(edge.parent.x + edge.child.x) / 2}
                      y={(edge.parent.y + edge.child.y) / 2 + 3}
                      textAnchor="middle"
                      fill="#ef4444"
                      style={{ fontSize: 9, fontWeight: 900, cursor: 'pointer', pointerEvents: 'none' }}
                    >
                      ×
                    </text>
                  </g>
                );
              })}

              {/* Node cards */}
              {graphNodes.map(node => {
                const styles = getNodeStyles(node);
                const isParentNode = node.tier === 'parent' || (!selectedNodeId && node.level === 0);
                const isChildNode = node.tier === 'child' || (!selectedNodeId && node.level > 1);
                
                let highlightColor = '#6366f1';
                if (isParentNode) highlightColor = '#818cf8';
                if (isChildNode) highlightColor = '#f59e0b';
                if (node.id === selectedNodeId) highlightColor = '#10b981';

                return (
                  <g
                    key={node.id}
                    className="node-element"
                    transform={`translate(${node.x}, ${node.y})`}
                    style={{ cursor: 'pointer' }}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={() => handleSelectNode(node.id)}
                  >
                    {/* Node shadow */}
                    <rect x={-110} y={-30} width={220} height={70} rx={12} fill="rgba(0,0,0,0.15)" />
                    
                    {/* Node body */}
                    <rect
                      x={-110}
                      y={-30}
                      width={220}
                      height={70}
                      rx={12}
                      fill={styles.bg}
                      stroke={styles.border}
                      strokeWidth={styles.isFocused ? 2 : 1.5}
                      className="transition-all duration-150"
                    />

                    {/* Accent strip */}
                    <path
                      d="M -110 -18 L -110 18 A 12 12 0 0 0 -98 30 L -98 30 L -98 -30 L -98 -30 A 12 12 0 0 0 -110 -18 Z"
                      fill={highlightColor}
                    />

                    {/* Node Name */}
                    <text
                      x={-85}
                      y={-10}
                      fill={isLight ? '#0f172a' : '#ffffff'}
                      style={{ fontSize: 10, fontWeight: 800, fontFamily: 'Outfit,Inter,sans-serif' }}
                    >
                      {node.checklist_name.length > 28
                        ? node.checklist_name.slice(0, 26) + '...'
                        : node.checklist_name
                      }
                    </text>

                    {/* Node Input Type */}
                    <text
                      x={-85}
                      y={6}
                      fill={isLight ? '#64748b' : '#94a3b8'}
                      style={{ fontSize: 8.5, fontWeight: 600, fontFamily: 'Outfit,Inter,sans-serif' }}
                    >
                      {node.input_type} Item
                    </text>

                    {/* Node Aggregation config */}
                    <text
                      x={-85}
                      y={20}
                      fill={isLight ? '#64748b' : '#64748b'}
                      style={{ fontSize: 8, fontWeight: 700, fontFamily: 'Outfit,Inter,sans-serif', letterSpacing: '0.02em' }}
                    >
                      ◷ Preference: {node.aggregation}
                    </text>

                    {/* Average value badge */}
                    <g transform="translate(75, 12)">
                      <rect
                        x={-25}
                        y={-12}
                        width={50}
                        height={20}
                        rx={6}
                        fill="rgba(16, 185, 129, 0.12)"
                        stroke="rgba(16, 185, 129, 0.25)"
                        strokeWidth={1}
                      />
                      <text
                        x={0}
                        y={2}
                        textAnchor="middle"
                        fill="#34d399"
                        style={{ fontSize: 9, fontWeight: 800, fontFamily: 'Outfit,Inter,sans-serif' }}
                      >
                        {node.avg_value !== null
                          ? `${node.avg_value}${node.input_type === 'Boolean' ? '%' : ''}`
                          : '—'
                        }
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Empty state inside canvas */}
              {graphNodes.length === 0 && (
                <g transform="translate(0, 0)">
                  <text textAnchor="middle" fill={isLight ? '#64748b' : '#94a3b8'} style={{ fontSize: 13, fontWeight: 600 }}>
                    Select an item from the list or create links to display the KPI network.
                  </text>
                </g>
              )}
            </g>
          </svg>

          {/* Pan/Zoom Controllers */}
          <div className="absolute bottom-4 right-4 flex flex-col gap-1 p-1 bg-white/5 border border-glass-border rounded-2xl shadow-xl backdrop-blur-md z-30">
            <button onClick={zoomIn} title="Zoom In" className="p-2 hover:bg-white/10 text-text-muted hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center">
              <Plus size={14} />
            </button>
            <button onClick={zoomOut} title="Zoom Out" className="p-2 hover:bg-white/10 text-text-muted hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center">
              <Minus size={14} />
            </button>
            <div className="h-px bg-white/10 my-0.5 mx-1" />
            <button onClick={resetView} title="Reset View" className="p-2 hover:bg-white/10 text-text-muted hover:text-white rounded-xl transition-all cursor-pointer flex items-center justify-center">
              <Maximize2 size={14} />
            </button>
          </div>
        </div>

        {/* Right Detail Sidebar */}
        {selectedItem && (
          <div className="w-full lg:w-96 bg-bg-card backdrop-blur-xl border border-glass-border rounded-3xl p-5 flex flex-col shadow-xl shrink-0 animate-in slide-in-from-right duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <h4 className="text-xs font-black text-white uppercase tracking-wider">KPI Node Details</h4>
              <button onClick={() => handleSelectNode(null)} className="text-text-muted hover:text-white text-xs font-bold">Close</button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              <div>
                <span className="text-[9px] font-black uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary px-2 py-0.5 rounded">
                  {selectedItem.input_type} Node
                </span>
                <h5 className="text-sm font-extrabold text-white mt-2 leading-snug">{selectedItem.checklist_name}</h5>
              </div>

              {/* Stat grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/2 border border-white/5 rounded-2xl p-3 text-center">
                  <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block mb-1">Average</span>
                  <span className="text-sm font-black text-emerald-400">
                    {selectedItem.avg_value !== null
                      ? `${selectedItem.avg_value}${selectedItem.input_type === 'Boolean' ? '%' : ''}`
                      : '—'
                    }
                  </span>
                </div>
                <div className="bg-white/2 border border-white/5 rounded-2xl p-3 text-center">
                  <span className="text-[9px] text-text-muted font-bold uppercase tracking-wider block mb-1">Responses</span>
                  <span className="text-sm font-black text-white">{selectedItem.total_count ?? 0}</span>
                </div>
              </div>

              {/* Granularity Preferred Period */}
              <div className="bg-white/2 border border-white/5 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Calendar size={11} className="text-primary" /> Preferred Granularity
                  </span>
                  {savingPreference && (
                    <span className="text-[9px] text-accent animate-pulse font-bold flex items-center gap-1">
                      <RefreshCw size={8} className="animate-spin" /> Saving...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <select
                    value={selectedItem.aggregation || 'Monthly'}
                    onChange={(e) => handleUpdatePreferredAggregation(e.target.value)}
                    disabled={savingPreference}
                    className="w-full bg-slate-900/60 border border-glass-border focus:border-primary/50 rounded-xl px-3 py-2 text-xs text-white font-bold outline-none cursor-pointer disabled:opacity-50 appearance-none"
                  >
                    <option value="Daily" className="bg-[#0f172a]">Daily</option>
                    <option value="Weekly" className="bg-[#0f172a]">Weekly</option>
                    <option value="Monthly" className="bg-[#0f172a]">Monthly</option>
                    <option value="Quarterly" className="bg-[#0f172a]">Quarterly</option>
                  </select>
                  <div className="absolute right-3 top-3 pointer-events-none text-text-muted text-[10px]">▼</div>
                </div>
                <p className="text-[9px] text-text-sub font-semibold leading-relaxed">
                  Defines the default aggregate time-binning used when rendering system performance trends.
                </p>
              </div>

              {/* Analytics Trend Visualization */}
              <div className="bg-white/2 border border-white/5 rounded-2xl p-3.5 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <Activity size={11} className="text-accent" /> Performance Trend
                  </span>
                  
                  {/* Aggregation Override Control / Toggle Button Group */}
                  <div className="flex bg-white/5 border border-white/10 rounded-lg p-0.5">
                    {['Daily', 'Weekly', 'Monthly', 'Quarterly'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCurrentAggregation(mode)}
                        className={`px-1.5 py-0.5 text-[8px] font-black rounded transition-all cursor-pointer ${
                          currentAggregation === mode
                            ? 'bg-primary text-white shadow-sm'
                            : 'text-text-muted hover:text-white'
                        }`}
                        title={`View ${mode} aggregation`}
                      >
                        {mode[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedItemTrendLoading ? (
                  <div className="h-28 flex flex-col items-center justify-center gap-2 text-text-muted">
                    <RefreshCw size={14} className="animate-spin text-accent" />
                    <span className="text-[10px] font-bold">Loading trend data...</span>
                  </div>
                ) : selectedItemTrendError ? (
                  <div className="h-28 flex items-center justify-center text-center p-2">
                    <p className="text-[9px] text-danger font-semibold">{selectedItemTrendError}</p>
                  </div>
                ) : selectedItemTrend.length === 0 ? (
                  <div className="h-28 flex items-center justify-center text-center p-4">
                    <p className="text-[10px] text-text-muted/70 font-semibold italic">No responses recorded.</p>
                  </div>
                ) : (
                  <div className="h-32 w-full -ml-4 pr-2 mt-1">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={selectedItemTrend}>
                        <defs>
                          <linearGradient id="colorTrend" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0.3}/>
                            <stop offset="95%" stopColor="var(--color-primary, #6366f1)" stopOpacity={0}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" vertical={false} />
                        <XAxis 
                          dataKey="period" 
                          stroke="rgba(255,255,255,0.3)" 
                          fontSize={8}
                          tickLine={false}
                          axisLine={false}
                          dy={6}
                        />
                        <YAxis 
                          stroke="rgba(255,255,255,0.3)" 
                          fontSize={8}
                          tickLine={false}
                          axisLine={false}
                          dx={-4}
                          domain={selectedItem.input_type === 'Boolean' ? [0, 100] : ['auto', 'auto']}
                          tickFormatter={(val) => `${val}${selectedItem.input_type === 'Boolean' ? '%' : ''}`}
                        />
                        <RechartsTooltip 
                          contentStyle={{ 
                            background: '#090d16', 
                            border: '1px solid rgba(255,255,255,0.08)', 
                            borderRadius: '8px',
                            fontSize: '9px',
                            fontWeight: 'bold',
                            fontFamily: 'Outfit,sans-serif'
                          }}
                          labelStyle={{ color: '#94a3b8', marginBottom: '2px' }}
                          itemStyle={{ color: '#10b981' }}
                          formatter={(value) => [
                            `${value}${selectedItem.input_type === 'Boolean' ? '%' : ''}`, 
                            'Average'
                          ]}
                        />
                        <Area 
                          type="monotone" 
                          dataKey="avg_value" 
                          stroke="var(--color-primary, #6366f1)" 
                          strokeWidth={2}
                          fillOpacity={1} 
                          fill="url(#colorTrend)" 
                        />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Linked Items Directory */}
              <div className="space-y-3">
                {/* Parents */}
                <div>
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider flex items-center gap-1 mb-2">
                    <ArrowUp size={11} className="text-indigo-400" /> Linked Parents ({selectedItem.parent_ids?.length || 0})
                  </span>
                  <div className="space-y-1">
                    {(selectedItem.parent_ids || []).map(pId => {
                      const pItem = items.find(i => i.id === pId);
                      if (!pItem) return null;
                      return (
                        <button
                          key={pId}
                          onClick={() => handleSelectNode(pId)}
                          className="w-full text-left px-2.5 py-1.5 bg-white/2 hover:bg-white/5 border border-white/5 rounded-lg text-[10px] text-text-muted hover:text-white truncate block font-bold transition-all cursor-pointer"
                        >
                          {pItem.checklist_name}
                        </button>
                      );
                    })}
                    {(!selectedItem.parent_ids || selectedItem.parent_ids.length === 0) && (
                      <p className="text-[10px] text-text-muted/60 italic px-1">No parent relationships.</p>
                    )}
                  </div>
                </div>

                {/* Children */}
                <div>
                  <span className="text-[10px] text-text-muted font-bold uppercase tracking-wider flex items-center gap-1 mb-2">
                    <ArrowDown size={11} className="text-amber-400" /> Linked Children ({selectedItem.child_ids?.length || 0})
                  </span>
                  <div className="space-y-1">
                    {(selectedItem.child_ids || []).map(cId => {
                      const cItem = items.find(i => i.id === cId);
                      if (!cItem) return null;
                      return (
                        <button
                          key={cId}
                          onClick={() => handleSelectNode(cId)}
                          className="w-full text-left px-2.5 py-1.5 bg-white/2 hover:bg-white/5 border border-white/5 rounded-lg text-[10px] text-text-muted hover:text-white truncate block font-bold transition-all cursor-pointer"
                        >
                          {cItem.checklist_name}
                        </button>
                      );
                    })}
                    {(!selectedItem.child_ids || selectedItem.child_ids.length === 0) && (
                      <p className="text-[10px] text-text-muted/60 italic px-1">No child relationships.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Link Creation Modal */}
      {isLinking && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleCreateLink} className="bg-[#0f172a] border border-glass-border rounded-3xl p-6 w-full max-w-md space-y-4 shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-3 border-b border-white/5">
              <h4 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
                <Link2 size={14} className="text-primary" />
                Link KPI Relationship
              </h4>
              <button type="button" onClick={() => setIsLinking(false)} className="text-text-muted hover:text-white">✕</button>
            </div>

            <p className="text-[10px] text-text-muted">
              Connect two checklist metrics together. Typically, parent nodes represent aggregate metrics while children nodes represent individual sub-metrics.
            </p>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[10px] text-text-muted font-bold uppercase">Parent KPI Item</label>
                <select
                  value={linkParentId}
                  onChange={(e) => setLinkParentId(e.target.value)}
                  className="w-full bg-white/5 border border-glass-border focus:border-primary/50 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  required
                >
                  <option value="" disabled className="bg-[#0f172a]">-- Select Parent Item --</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id} className="bg-[#0f172a]">{item.checklist_name} ({item.input_type})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] text-text-muted font-bold uppercase">Child KPI Item</label>
                <select
                  value={linkChildId}
                  onChange={(e) => setLinkChildId(e.target.value)}
                  className="w-full bg-white/5 border border-glass-border focus:border-primary/50 rounded-xl px-3 py-2 text-xs text-white outline-none"
                  required
                >
                  <option value="" disabled className="bg-[#0f172a]">-- Select Child Item --</option>
                  {items.filter(item => Number(item.id) !== Number(linkParentId)).map(item => (
                    <option key={item.id} value={item.id} className="bg-[#0f172a]">{item.checklist_name} ({item.input_type})</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsLinking(false)}
                className="px-4 py-2 bg-white/5 hover:bg-white/10 text-text-muted rounded-xl text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingLink}
                className="px-4 py-2 bg-primary hover:bg-primary/95 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                {savingLink ? 'Saving...' : 'Link Items'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
