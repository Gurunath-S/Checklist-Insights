import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import {
  Search, Link2, Activity, Calendar,
  Plus, Minus, Maximize2, Trash2, ArrowUp, ArrowDown, RefreshCw,
  LayoutTemplate, Tag, Move, ArrowRight, Layers, RotateCcw, Filter, CheckSquare, Square, Palette, X, Check, FilePlus, Link, LayoutGrid, ChevronDown, FolderOpen
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip
} from 'recharts';
import { useThemeStore } from '../../../store/useThemeStore';
import {
  getKPINetworkApi,
  getItemAnalyticsApi,
  updateItemConfigApi,
  createKPINetworkLinkApi,
  deleteKPINetworkLinkApi
} from '../services/kpiNetworkService';

// Custom Detailed Hover Tooltip for Single & Multi-Metric Performance Line Charts
const CustomTrendTooltip = ({ active, payload, label, isLight }) => {
  if (!active || !payload || !payload.length) return null;
  return (
    <div className={`p-3 rounded-2xl border shadow-2xl backdrop-blur-md text-xs space-y-2 min-w-[170px] z-50 ${
      isLight ? 'bg-white/95 border-slate-200 text-slate-900' : 'bg-slate-900/95 border-white/10 text-white'
    }`}>
      <div className="flex items-center justify-between border-b pb-1.5 border-white/10 gap-2">
        <span className="text-[10px] font-black uppercase tracking-wider text-primary">Period:</span>
        <span className="text-xs font-black">{label}</span>
      </div>
      <div className="space-y-1.5">
        {payload.map((entry, idx) => (
          <div key={`tp-${idx}`} className="flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm" style={{ backgroundColor: entry.color }} />
              <span className="font-bold truncate max-w-[130px]" title={entry.name}>
                {entry.name}
              </span>
            </div>
            <span className="font-black shrink-0 font-mono text-primary">
              {typeof entry.value === 'number' ? entry.value.toFixed(1) : (entry.value ?? 'N/A')}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default function KPINetworkView() {
  const { theme } = useThemeStore();
  const isLight = theme === 'light';

  // API Data State
  const [items, setItems] = useState([]);
  const [relationships, setRelationships] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Single Item Analytics State
  const [selectedItemTrend, setSelectedItemTrend] = useState([]);
  const [selectedItemTrendLoading, setSelectedItemTrendLoading] = useState(false);
  const [selectedItemTrendError, setSelectedItemTrendError] = useState(null);
  const [currentAggregation, setCurrentAggregation] = useState('Monthly');
  const [savingPreference, setSavingPreference] = useState(false);

  // Multi-Metric Combined Trend State
  const [isCombinedView, setIsCombinedView] = useState(false);
  const [combinedTrendData, setCombinedTrendData] = useState([]);
  const [linkedAnalyticsMap, setLinkedAnalyticsMap] = useState({});
  const [combinedLoading, setCombinedLoading] = useState(false);

  // UI & Node Selection State
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedNodeId, setHighlightedNodeId] = useState(null); // Single click selection (highlights node on canvas)
  const [detailsNodeId, setDetailsNodeId] = useState(null); // Double click / double tap (opens right details panel)
  const [hoveredNodeId, setHoveredNodeId] = useState(null);
  const [notification, setNotification] = useState(null);
  const [addedCanvasItemIds, setAddedCanvasItemIds] = useState(new Set());
  const [isFocusMode, setIsFocusMode] = useState(false);

  // 1-Click Interactive Connecting Mode State
  const [connectingParentNodeId, setConnectingParentNodeId] = useState(null);

  // Explorer Tabs & Sorting / Filtering
  const [leftTab, setLeftTab] = useState('items'); // 'items' | 'templates' | 'tags'
  const [selectedGroupFilter, setSelectedGroupFilter] = useState(null);
  const [linkStatusFilter, setLinkStatusFilter] = useState('all'); // 'all' | 'linked' | 'unlinked'
  const [sortOption, setSortOption] = useState('most_used'); // 'most_used' | 'least_used' | 'alphabetical'

  // Batch Linking Modal State
  const [isLinking, setIsLinking] = useState(false);
  const [linkParentId, setLinkParentId] = useState('');
  const [selectedChildIds, setSelectedChildIds] = useState([]);
  const [modalChildSearch, setModalChildSearch] = useState('');
  const [savingLink, setSavingLink] = useState(false);

  // Interactive Node Dragging & SVG Pan/Zoom State
  const svgRef = useRef(null);
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [customPositions, setCustomPositions] = useState(() => {
    try {
      const saved = localStorage.getItem('kpi_network_custom_positions');
      return saved ? JSON.parse(saved) : {};
    } catch (e) {
      return {};
    }
  });

  // Persist custom layout node positions across browser refreshes & page navigation
  useEffect(() => {
    try {
      if (Object.keys(customPositions).length > 0) {
        localStorage.setItem('kpi_network_custom_positions', JSON.stringify(customPositions));
      } else {
        localStorage.removeItem('kpi_network_custom_positions');
      }
    } catch (e) {
      console.error('Failed to save layout positions to localStorage:', e);
    }
  }, [customPositions]);

  // Saved Chart Canvas Views Persistence
  const [savedCharts, setSavedCharts] = useState(() => {
    try {
      const saved = localStorage.getItem('kpi_network_saved_charts');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });
  const [activeChartTitle, setActiveChartTitle] = useState('Default Chart');
  const [showSavedChartsMenu, setShowSavedChartsMenu] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem('kpi_network_saved_charts', JSON.stringify(savedCharts));
    } catch (e) {
      console.error('Failed to save charts to localStorage:', e);
    }
  }, [savedCharts]);

  const draggingCanvas = useRef(false);
  const draggingNodeId = useRef(null);
  const lastMousePos = useRef({ x: 0, y: 0 });
  const nodeDragStartOffset = useRef({ mouseX: 0, mouseY: 0, nodeX: 0, nodeY: 0 });
  const rafRef = useRef(null);

  // Fetch KPI Network Data
  const fetchData = async () => {
    try {
      setLoading(true);
      const data = await getKPINetworkApi();
      setItems(data.items || []);
      setRelationships(data.relationships || []);
      setTemplates(data.templates || []);
      setTags(data.tags || []);
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

  // Show auto-dismiss toast notification
  const triggerNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  // Currently open details item (opened on double click / double tap)
  const detailsItem = useMemo(() => {
    return items.find(item => item.id === detailsNodeId);
  }, [items, detailsNodeId]);

  // Single Click Node Handler
  const handleSingleClickNode = useCallback((nodeId) => {
    if (connectingParentNodeId) {
      if (connectingParentNodeId === nodeId) {
        setConnectingParentNodeId(null);
        return;
      }
      handleCreateDirectLink(connectingParentNodeId, nodeId);
      return;
    }
    setAddedCanvasItemIds(prev => new Set(prev).add(nodeId));
    setHighlightedNodeId(prev => (prev === nodeId ? null : nodeId));
  }, [connectingParentNodeId]);

  // Direct 1-Click Relationship Creation
  const handleCreateDirectLink = async (parentId, childId) => {
    try {
      setSavingLink(true);
      await createKPINetworkLinkApi({
        parent_item_id: parentId,
        child_item_id: childId
      });
      const parentNode = items.find(i => i.id === parentId);
      const childNode = items.find(i => i.id === childId);
      triggerNotification(`Linked "${parentNode?.checklist_name || 'Parent'}" → "${childNode?.checklist_name || 'Child'}"`);
      setConnectingParentNodeId(null);
      fetchData();
    } catch (err) {
      console.error(err);
      if (err.response?.status === 409) {
        triggerNotification('Connection already exists between these two metrics.', 'error');
      } else {
        triggerNotification(err.response?.data?.error || 'Failed to create connection.', 'error');
      }
    } finally {
      setSavingLink(false);
    }
  };

  // Double Click / Double Tap Node Handler: Opens right Node Details drawer
  const handleDoubleClickNode = useCallback((nodeId) => {
    if (connectingParentNodeId) return;
    setDetailsNodeId(nodeId);
    setHighlightedNodeId(nodeId);
    if (nodeId) {
      const node = items.find(i => i.id === nodeId);
      if (node) {
        setCurrentAggregation(node.aggregation || 'Monthly');
      }
    }
  }, [items, connectingParentNodeId]);

  // Remove individual node from canvas
  const handleRemoveNodeFromCanvas = (nodeId) => {
    setAddedCanvasItemIds(prev => {
      const next = new Set(prev);
      next.delete(nodeId);
      return next;
    });
    setCustomPositions(prev => {
      const next = { ...prev };
      delete next[nodeId];
      return next;
    });
    if (highlightedNodeId === nodeId) setHighlightedNodeId(null);
    if (detailsNodeId === nodeId) setDetailsNodeId(null);
    triggerNotification('Removed node from active canvas view.');
  };

  // Fetch Analytics & Combined Trend for Details Panel
  useEffect(() => {
    if (!detailsNodeId || !detailsItem) {
      setSelectedItemTrend([]);
      setCombinedTrendData([]);
      setLinkedAnalyticsMap({});
      return;
    }

    const fetchAnalytics = async () => {
      try {
        setSelectedItemTrendLoading(true);
        setCombinedLoading(true);
        setSelectedItemTrendError(null);

        // 1. Fetch main target node analytics
        const mainData = await getItemAnalyticsApi(detailsNodeId, { aggregation: currentAggregation });
        const mainTrend = mainData.trend || [];
        setSelectedItemTrend(mainTrend);

        // 2. Fetch linked parents and children analytics concurrently
        const parentIds = detailsItem.parent_ids || [];
        const childIds = detailsItem.child_ids || [];
        const linkedIds = [...new Set([...parentIds, ...childIds])];

        const linkedResults = await Promise.all(
          linkedIds.map(async (id) => {
            try {
              const res = await getItemAnalyticsApi(id, { aggregation: currentAggregation });
              const linkedItem = items.find(i => i.id === id);
              return { id, name: linkedItem?.checklist_name || `Item ${id}`, trend: res.trend || [], total: res.total_responses };
            } catch (err) {
              return null;
            }
          })
        );

        const analyticsMap = {};
        linkedResults.forEach(r => {
          if (r) analyticsMap[r.id] = r;
        });
        setLinkedAnalyticsMap(analyticsMap);

        // 3. Merge periods for combined Recharts visualization
        const periodMap = {};
        mainTrend.forEach(pt => {
          periodMap[pt.period] = { period: pt.period, target: pt.avg_value };
        });

        linkedIds.forEach(id => {
          const lData = analyticsMap[id];
          if (lData && lData.trend) {
            lData.trend.forEach(pt => {
              if (!periodMap[pt.period]) {
                periodMap[pt.period] = { period: pt.period };
              }
              periodMap[pt.period][`node_${id}`] = pt.avg_value;
            });
          }
        });

        const mergedList = Object.values(periodMap);
        setCombinedTrendData(mergedList);
      } catch (err) {
        console.error('Error fetching trend analytics:', err);
        setSelectedItemTrendError(err.response?.data?.error || 'Failed to load trend data');
      } finally {
        setSelectedItemTrendLoading(false);
        setCombinedLoading(false);
      }
    };

    fetchAnalytics();
  }, [detailsNodeId, currentAggregation, detailsItem, items]);

  // Update Preferred Granularity for Selected Node
  const handleUpdatePreferredAggregation = async (newAggregation) => {
    if (!detailsNodeId) return;
    try {
      setSavingPreference(true);
      await updateItemConfigApi(detailsNodeId, { aggregation: newAggregation });
      triggerNotification('Preferred granularity updated successfully.');
      
      setItems(prevItems => prevItems.map(item => 
        item.id === detailsNodeId ? { ...item, aggregation: newAggregation } : item
      ));
      setCurrentAggregation(newAggregation);
    } catch (err) {
      console.error('Error updating aggregation preference:', err);
      triggerNotification('Failed to update preferred granularity.', 'error');
    } finally {
      setSavingPreference(false);
    }
  };

  // Filtered & Sorted items list for Checklist Explorer
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Link Status Filter
    if (linkStatusFilter === 'linked') {
      result = result.filter(item => (item.parent_ids?.length || 0) + (item.child_ids?.length || 0) > 0);
    } else if (linkStatusFilter === 'unlinked') {
      result = result.filter(item => (item.parent_ids?.length || 0) + (item.child_ids?.length || 0) === 0);
    }

    // Group Filter (by Template or Tag)
    if (selectedGroupFilter) {
      if (selectedGroupFilter.type === 'template') {
        result = result.filter(item => item.template_names?.includes(selectedGroupFilter.name));
      } else if (selectedGroupFilter.type === 'tag') {
        result = result.filter(item => item.tag_names?.includes(selectedGroupFilter.name));
      }
    }

    // Search Term Filter
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(item =>
        item.checklist_name.toLowerCase().includes(term) ||
        item.input_type.toLowerCase().includes(term) ||
        (item.template_names && item.template_names.some(t => t.toLowerCase().includes(term))) ||
        (item.tag_names && item.tag_names.some(t => t.toLowerCase().includes(term)))
      );
    }

    // Sort according to sortOption
    return result.sort((a, b) => {
      if (sortOption === 'least_used') {
        return (a.total_count ?? 0) - (b.total_count ?? 0);
      }
      if (sortOption === 'alphabetical') {
        return a.checklist_name.localeCompare(b.checklist_name);
      }
      // Default: 'most_used'
      return (b.total_count ?? 0) - (a.total_count ?? 0);
    });
  }, [items, selectedGroupFilter, searchTerm, linkStatusFilter, sortOption]);

  // Filtered & Sorted templates list
  const [templates, setTemplates] = useState([]);
  const filteredTemplates = useMemo(() => {
    let result = [...templates];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(t =>
        t.template_name.toLowerCase().includes(term) ||
        t.tag_name.toLowerCase().includes(term)
      );
    }
    return result.sort((a, b) => {
      if (sortOption === 'least_items') return a.itemIds.length - b.itemIds.length;
      if (sortOption === 'alphabetical') return a.template_name.localeCompare(b.template_name);
      return b.itemIds.length - a.itemIds.length;
    });
  }, [templates, searchTerm, sortOption]);

  // Filtered & Sorted tags list
  const [tags, setTags] = useState([]);
  const filteredTags = useMemo(() => {
    let result = [...tags];
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(tg =>
        tg.tag_name.toLowerCase().includes(term) ||
        (tg.user_position && tg.user_position.toLowerCase().includes(term))
      );
    }
    return result.sort((a, b) => {
      if (sortOption === 'least_items') return a.itemIds.length - b.itemIds.length;
      if (sortOption === 'alphabetical') return a.tag_name.localeCompare(b.tag_name);
      return b.itemIds.length - a.itemIds.length;
    });
  }, [tags, searchTerm, sortOption]);

  // Compute Layout for SVG Graph Nodes without shifts or layout movements
  const graphNodes = useMemo(() => {
    if (items.length === 0) return [];

    const levelSpacingY = 220;
    const nodeSpacingX = 280;

    let computedList = [];

    // Optional Focus Mode: If explicitly turned on and node highlighted
    if (isFocusMode && highlightedNodeId) {
      const selected = items.find(i => i.id === highlightedNodeId);
      if (!selected) return [];

      const nodeMap = new Map();
      
      // Center node (Selected)
      nodeMap.set(selected.id, {
        ...selected,
        baseX: 0,
        baseY: 0,
        tier: 'center',
        isFocused: true
      });

      // Parent tier (Above)
      const parentIds = selected.parent_ids || [];
      const numParents = parentIds.length;
      parentIds.forEach((pId, idx) => {
        const pNode = items.find(i => i.id === pId);
        if (pNode) {
          const xOffset = numParents > 1 ? (idx - (numParents - 1) / 2) * nodeSpacingX : 0;
          nodeMap.set(pId, {
            ...pNode,
            baseX: xOffset,
            baseY: -levelSpacingY,
            tier: 'parent'
          });
        }
      });

      // Child tier (Below)
      const childIds = selected.child_ids || [];
      const numChildren = childIds.length;
      childIds.forEach((cId, idx) => {
        const cNode = items.find(i => i.id === cId);
        if (cNode) {
          const xOffset = numChildren > 1 ? (idx - (numChildren - 1) / 2) * nodeSpacingX : 0;
          nodeMap.set(cId, {
            ...cNode,
            baseX: xOffset,
            baseY: levelSpacingY,
            tier: 'child'
          });
        }
      });

      computedList = Array.from(nodeMap.values());
    } else {
      // Standard Graph View: Display all connected nodes + ALL manually added nodes via drag-and-drop
      const activeNodes = items.filter(item => 
        (item.parent_ids && item.parent_ids.length > 0) || 
        (item.child_ids && item.child_ids.length > 0) ||
        addedCanvasItemIds.has(item.id)
      );

      if (activeNodes.length === 0) return [];

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

      activeNodes.forEach(node => getLevel(node.id));

      const nodesByLevel = {};
      activeNodes.forEach(node => {
        const lvl = levels[node.id] || 0;
        if (!nodesByLevel[lvl]) nodesByLevel[lvl] = [];
        nodesByLevel[lvl].push(node);
      });

      Object.keys(nodesByLevel).forEach(lvlKey => {
        const lvl = parseInt(lvlKey);
        const lvlNodes = nodesByLevel[lvl];
        const count = lvlNodes.length;
        lvlNodes.forEach((node, idx) => {
          const xOffset = (idx - (count - 1) / 2) * nodeSpacingX;
          computedList.push({
            ...node,
            baseX: xOffset,
            baseY: (lvl - 1) * levelSpacingY,
            level: lvl
          });
        });
      });
    }

    // Merge custom interactive dragging positions
    return computedList.map(n => ({
      ...n,
      x: customPositions[n.id]?.x ?? n.baseX,
      y: customPositions[n.id]?.y ?? n.baseY
    }));
  }, [items, highlightedNodeId, isFocusMode, customPositions, addedCanvasItemIds]);

  // Compute active edges between nodes
  const graphEdges = useMemo(() => {
    const activeNodeIds = new Set(graphNodes.map(n => n.id));
    const edges = [];

    relationships.forEach(rel => {
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

  // Smart Edge Attachment: Attaches edge lines & arrowheads directly to outer card boundaries (Top, Bottom, Left, Right)
  const makeEdgePath = (parent, child) => {
    const hw = 135; // half width of enlarged node card
    const hh = 43;  // half height of enlarged node card
    const gap = 4;  // gap to ensure arrowhead is 100% visible outside node border

    const dx = child.x - parent.x;
    const dy = child.y - parent.y;

    let sx = parent.x;
    let sy = parent.y;
    let ex = child.x;
    let ey = child.y;

    const isHorizontal = Math.abs(dx) > Math.abs(dy) * 1.1;

    if (isHorizontal) {
      // Side-by-Side (Left <-> Right) Connection
      if (dx > 0) {
        // Child is to the Right of Parent
        sx = parent.x + hw;
        sy = parent.y;
        ex = child.x - hw - gap;
        ey = child.y;
      } else {
        // Child is to the Left of Parent
        sx = parent.x - hw;
        sy = parent.y;
        ex = child.x + hw + gap;
        ey = child.y;
      }
    } else {
      // Top-to-Bottom or Bottom-to-Top Connection
      if (dy > 0) {
        // Child is Below Parent
        sx = parent.x;
        sy = parent.y + hh;
        ex = child.x;
        ey = child.y - hh - gap;
      } else {
        // Child is Above Parent
        sx = parent.x;
        sy = parent.y - hh;
        ex = child.x;
        ey = child.y + hh + gap;
      }
    }

    // Bezier Curve Control Points
    let cp1x, cp1y, cp2x, cp2y;
    if (isHorizontal) {
      const midX = sx + (ex - sx) * 0.5;
      cp1x = midX;
      cp1y = sy;
      cp2x = midX;
      cp2y = ey;
    } else {
      const midY = sy + (ey - sy) * 0.5;
      cp1x = sx;
      cp1y = midY;
      cp2x = ex;
      cp2y = midY;
    }

    return `M ${sx} ${sy} C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${ex} ${ey}`;
  };

  // Mouse Event Throttling for Canvas & Node Dragging
  const handleCanvasMouseDown = (e) => {
    if (e.target.closest('.node-element')) return;
    draggingCanvas.current = true;
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleNodeMouseDown = (e, node) => {
    e.stopPropagation();
    draggingNodeId.current = node.id;
    nodeDragStartOffset.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      nodeX: node.x,
      nodeY: node.y
    };
  };

  const handleMouseMove = (e) => {
    if (draggingNodeId.current) {
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const scale = transform.scale || 1;
          const dx = (e.clientX - nodeDragStartOffset.current.mouseX) / scale;
          const dy = (e.clientY - nodeDragStartOffset.current.mouseY) / scale;
          setCustomPositions(prev => ({
            ...prev,
            [draggingNodeId.current]: {
              x: Math.round(nodeDragStartOffset.current.nodeX + dx),
              y: Math.round(nodeDragStartOffset.current.nodeY + dy)
            }
          }));
        });
      }
      return;
    }

    if (draggingCanvas.current) {
      if (!rafRef.current) {
        rafRef.current = requestAnimationFrame(() => {
          rafRef.current = null;
          const dx = e.clientX - lastMousePos.current.x;
          const dy = e.clientY - lastMousePos.current.y;
          lastMousePos.current = { x: e.clientX, y: e.clientY };
          setTransform(t => ({ ...t, x: t.x + dx, y: t.y + dy }));
        });
      }
    }
  };

  const handleMouseUp = (e) => {
    if (draggingNodeId.current && e) {
      const targetElem = e.target.closest('.node-element');
      if (targetElem) {
        const targetId = parseInt(targetElem.getAttribute('data-node-id'));
        if (targetId && targetId !== draggingNodeId.current) {
          handleCreateDirectLink(draggingNodeId.current, targetId);
        }
      }
    }
    draggingNodeId.current = null;
    draggingCanvas.current = false;
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const factor = e.deltaY > 0 ? 0.9 : 1.1;
    setTransform(t => ({
      ...t,
      scale: Math.min(2.5, Math.max(0.2, t.scale * factor))
    }));
  };

  // Drag and Drop metric onto canvas or onto an existing node
  const handleCanvasDrop = (e) => {
    e.preventDefault();
    const idStr = e.dataTransfer.getData('text/plain');
    const nodeId = parseInt(idStr);
    if (!nodeId) return;

    // Check if dropped onto an existing node card
    const targetNodeElement = e.target.closest('.node-element');
    if (targetNodeElement) {
      const targetIdStr = targetNodeElement.getAttribute('data-node-id');
      const targetNodeId = parseInt(targetIdStr);
      if (targetNodeId && targetNodeId !== nodeId) {
        handleCreateDirectLink(nodeId, targetNodeId);
        return;
      }
    }

    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const scale = transform.scale || 1;
    const dropGraphX = Math.round((mouseX - centerX - transform.x) / scale);
    const dropGraphY = Math.round((mouseY - centerY - transform.y) / scale);

    setCustomPositions(prev => ({
      ...prev,
      [nodeId]: { x: dropGraphX, y: dropGraphY }
    }));

    setAddedCanvasItemIds(prev => new Set(prev).add(nodeId));
    setHighlightedNodeId(nodeId);
    triggerNotification(`Added metric to active chart canvas.`);
  };

  const zoomIn = () => setTransform(t => ({ ...t, scale: Math.min(2.5, t.scale * 1.2) }));
  const zoomOut = () => setTransform(t => ({ ...t, scale: Math.max(0.2, t.scale / 1.2) }));
  const resetView = () => setTransform({ x: 0, y: 0, scale: 1 });

  // Auto-arrange graph nodes into clean hierarchical tiers
  const handleAutoArrangeChart = () => {
    if (graphNodes.length === 0) return;
    const newPositions = {};
    graphNodes.forEach(node => {
      newPositions[node.id] = {
        x: node.baseX,
        y: node.baseY
      };
    });
    setCustomPositions(newPositions);
    triggerNotification('Auto-arranged chart nodes into clean, balanced tiers.');
  };

  // Create New Fresh Canvas: Saves current active chart session first, then opens blank slate
  const handleStartNewChart = () => {
    // If current chart has positions or canvas items, auto-save to Saved Charts list
    if (Object.keys(customPositions).length > 0 || addedCanvasItemIds.size > 0) {
      const nextNum = savedCharts.length + 1;
      const chartTitle = `Saved Chart ${nextNum}`;
      const savedEntry = {
        id: Date.now().toString(),
        name: chartTitle,
        date: new Date().toLocaleDateString([], { month: 'short', day: 'numeric' }),
        customPositions: { ...customPositions },
        addedCanvasItemIds: Array.from(addedCanvasItemIds)
      };
      setSavedCharts(prev => [savedEntry, ...prev]);
      triggerNotification(`Saved active layout as "${chartTitle}" & opened a fresh chart.`);
    } else {
      triggerNotification('Opened a fresh chart canvas.');
    }

    setCustomPositions({});
    setAddedCanvasItemIds(new Set());
    setHighlightedNodeId(null);
    setDetailsNodeId(null);
    setConnectingParentNodeId(null);
    setIsFocusMode(false);
    setActiveChartTitle(`Chart ${savedCharts.length + 2}`);
  };

  // Load a saved chart view from saved list
  const handleLoadSavedChart = (chart) => {
    setCustomPositions(chart.customPositions || {});
    setAddedCanvasItemIds(new Set(chart.addedCanvasItemIds || []));
    setActiveChartTitle(chart.name);
    setShowSavedChartsMenu(false);
    triggerNotification(`Loaded "${chart.name}".`);
  };

  // Delete a saved chart from saved list
  const handleDeleteSavedChart = (chartId, e) => {
    e.stopPropagation();
    setSavedCharts(prev => prev.filter(c => c.id !== chartId));
    triggerNotification('Deleted saved chart view.');
  };

  // Batch Relationship Linking Action
  const handleBatchCreateLinks = async (e) => {
    e.preventDefault();
    if (!linkParentId || selectedChildIds.length === 0) return;
    try {
      setSavingLink(true);
      await Promise.all(
        selectedChildIds.map(cId =>
          createKPINetworkLinkApi({
            parent_item_id: parseInt(linkParentId),
            child_item_id: parseInt(cId)
          }).catch(err => {
            if (err.response?.status !== 409) throw err;
          })
        )
      );
      triggerNotification(`Successfully linked ${selectedChildIds.length} metric relationship(s).`);
      setLinkParentId('');
      setSelectedChildIds([]);
      setIsLinking(false);
      fetchData();
    } catch (err) {
      console.error(err);
      triggerNotification(err.response?.data?.error || 'Failed to create links', 'error');
    } finally {
      setSavingLink(false);
    }
  };

  // Delete Link Trigger
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

  // Clean, Unified Node Styles
  const getNodeStyles = (node) => {
    const isHighlighted = node.id === highlightedNodeId;
    const isHovered = node.id === hoveredNodeId;
    const isDetailsOpen = node.id === detailsNodeId;
    const isConnectingParent = node.id === connectingParentNodeId;

    let border = isLight ? '#cbd5e1' : 'rgba(255,255,255,0.12)';
    let bg = isLight ? '#ffffff' : 'rgba(15, 23, 42, 0.95)';

    if (isConnectingParent) {
      border = '#6366f1';
      bg = isLight ? '#e0e7ff' : 'rgba(99, 102, 241, 0.25)';
    } else if (isDetailsOpen) {
      border = '#10b981';
    } else if (isHighlighted) {
      border = '#6366f1';
    } else if (isHovered) {
      border = isLight ? '#6366f1' : 'rgba(99, 102, 241, 0.8)';
    }

    return { bg, border, isHighlighted, isHovered, isDetailsOpen, isConnectingParent };
  };

  const connectingParentItem = useMemo(() => {
    return items.find(i => i.id === connectingParentNodeId);
  }, [items, connectingParentNodeId]);

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-190px)] min-h-[550px]">
      
      {/* Toast Notification */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border shadow-xl animate-in fade-in slide-in-from-top duration-300 ${
          notification.type === 'success'
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-600'
            : 'bg-red-500/10 border-red-500/30 text-red-500'
        }`}>
          <span className="text-xs font-bold">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="text-current hover:opacity-80 font-black cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Left Panel: Search, Filter, Sort & Explorer */}
      <div className={`w-full lg:w-96 border rounded-3xl p-4.5 flex flex-col shadow-xl shrink-0 ${
        isLight ? 'bg-white/90 border-slate-200 text-slate-900' : 'bg-bg-card border-glass-border text-white'
      }`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`text-sm font-black flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
            <Activity size={16} className="text-primary" />
            Checklist Explorer
          </h3>
          <span className={`text-xs border px-2.5 py-0.5 rounded-full font-bold ${
            isLight ? 'bg-slate-100 border-slate-200 text-slate-700' : 'bg-white/5 border-white/10 text-text-muted'
          }`}>
            {leftTab === 'items' ? `${filteredItems.length} items` : leftTab === 'templates' ? `${filteredTemplates.length} tmpls` : `${filteredTags.length} tags`}
          </span>
        </div>

        {/* View Switcher Tabs: Items | Templates | Tags */}
        <div className={`grid grid-cols-3 gap-1 p-1 rounded-2xl mb-3 text-xs font-bold border ${
          isLight ? 'bg-slate-100 border-slate-200' : 'bg-white/3 border-white/5'
        }`}>
          <button
            type="button"
            onClick={() => { setLeftTab('items'); setSelectedGroupFilter(null); }}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              leftTab === 'items'
                ? isLight ? 'bg-white text-primary border border-slate-200 shadow-sm font-black' : 'bg-primary/20 text-white border border-primary/30 shadow'
                : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60' : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <Activity size={13} /> Items
          </button>
          <button
            type="button"
            onClick={() => { setLeftTab('templates'); setSelectedGroupFilter(null); setSortOption('most_items'); }}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              leftTab === 'templates'
                ? isLight ? 'bg-white text-emerald-700 border border-slate-200 shadow-sm font-black' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow'
                : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60' : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <LayoutTemplate size={13} /> Templates
          </button>
          <button
            type="button"
            onClick={() => { setLeftTab('tags'); setSelectedGroupFilter(null); setSortOption('most_items'); }}
            className={`flex items-center justify-center gap-1.5 py-1.5 rounded-xl transition-all cursor-pointer ${
              leftTab === 'tags'
                ? isLight ? 'bg-white text-amber-700 border border-slate-200 shadow-sm font-black' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30 shadow'
                : isLight ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60' : 'text-text-muted hover:text-white hover:bg-white/5'
            }`}
          >
            <Tag size={13} /> Tags
          </button>
        </div>

        {/* Link Status Sub-Filter (for Items Tab) */}
        {leftTab === 'items' && (
          <div className={`flex items-center justify-between gap-1 mb-3 p-1 rounded-xl border ${
            isLight ? 'bg-slate-100/80 border-slate-200' : 'bg-white/2 border-white/5'
          }`}>
            {['all', 'linked', 'unlinked'].map(status => (
              <button
                key={status}
                onClick={() => setLinkStatusFilter(status)}
                className={`flex-1 py-1 text-xs font-black capitalize rounded-lg transition-all cursor-pointer ${
                  linkStatusFilter === status
                    ? status === 'linked' ? 'bg-indigo-600 text-white shadow-sm' :
                      status === 'unlinked' ? 'bg-slate-700 text-white shadow-sm' :
                      isLight ? 'bg-white text-slate-900 border border-slate-300 shadow-sm' : 'bg-white/10 text-white'
                    : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-text-muted hover:text-white'
                }`}
              >
                {status === 'unlinked' ? 'Standalone' : status}
              </button>
            ))}
          </div>
        )}

        {/* Sorting Dropdown & Search Bar */}
        <div className="space-y-2.5 mb-3">
          <div className="relative">
            <input
              type="text"
              placeholder={leftTab === 'items' ? "Search checklist items..." : leftTab === 'templates' ? "Search templates..." : "Search tags..."}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full pl-9 pr-8 py-2 text-xs font-bold border rounded-xl outline-none transition-all ${
                isLight
                  ? 'bg-white border-slate-300 text-slate-900 placeholder:text-slate-400 focus:border-indigo-500'
                  : 'bg-white/5 border-glass-border text-white placeholder:text-text-muted/65 focus:border-primary/50'
              }`}
            />
            <Search size={14} className={`absolute left-3 top-2.5 ${isLight ? 'text-slate-400' : 'text-text-muted'}`} />
            {searchTerm && (
              <button onClick={() => setSearchTerm('')} className={`absolute right-2.5 top-2.5 text-xs ${isLight ? 'text-slate-400 hover:text-slate-800' : 'text-text-muted hover:text-white'}`}>
                <X size={13} />
              </button>
            )}
          </div>

          <div className={`flex items-center justify-between text-xs font-bold px-1 ${isLight ? 'text-slate-600' : 'text-text-muted'}`}>
            <span className="flex items-center gap-1.5"><Filter size={11} /> Sort by:</span>
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value)}
              className={`border rounded-lg px-2.5 py-1 text-xs font-bold outline-none cursor-pointer ${
                isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900/80 border-glass-border text-white'
              }`}
            >
              {leftTab === 'items' ? (
                <>
                  <option value="most_used" className={isLight ? 'bg-white text-slate-900' : 'bg-[#0f172a] text-white'}>Most Used (Default)</option>
                  <option value="least_used" className={isLight ? 'bg-white text-slate-900' : 'bg-[#0f172a] text-white'}>Least Used</option>
                  <option value="alphabetical" className={isLight ? 'bg-white text-slate-900' : 'bg-[#0f172a] text-white'}>Alphabetical (A-Z)</option>
                </>
              ) : (
                <>
                  <option value="most_items" className={isLight ? 'bg-white text-slate-900' : 'bg-[#0f172a] text-white'}>Most Items (Default)</option>
                  <option value="least_items" className={isLight ? 'bg-white text-slate-900' : 'bg-[#0f172a] text-white'}>Least Items</option>
                  <option value="alphabetical" className={isLight ? 'bg-white text-slate-900' : 'bg-[#0f172a] text-white'}>Alphabetical (A-Z)</option>
                </>
              )}
            </select>
          </div>
        </div>

        {/* Active Group Filter Badge */}
        {selectedGroupFilter && (
          <div className="mb-2 p-1.5 bg-primary/10 border border-primary/20 rounded-xl flex items-center justify-between text-[10px] font-bold text-primary animate-fade-in">
            <span className="truncate">Filter: {selectedGroupFilter.name}</span>
            <button onClick={() => setSelectedGroupFilter(null)} className="hover:opacity-80 ml-2 font-black cursor-pointer">
              <X size={12} />
            </button>
          </div>
        )}

        {/* Explorer List Content */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
          {loading ? (
            <div className={`flex items-center justify-center py-10 gap-2 ${isLight ? 'text-slate-500' : 'text-text-muted'}`}>
              <RefreshCw size={14} className="animate-spin text-primary" />
              <span className="text-xs font-semibold">Loading explorer...</span>
            </div>
          ) : leftTab === 'items' ? (
            filteredItems.length === 0 ? (
              <p className={`text-xs text-center py-8 ${isLight ? 'text-slate-500' : 'text-text-muted'}`}>No items match your criteria.</p>
            ) : (
              filteredItems.map(item => {
                const isHighlighted = item.id === highlightedNodeId;
                const hasRelations = (item.parent_ids?.length || 0) + (item.child_ids?.length || 0) > 0;
                return (
                  <div
                    key={item.id}
                    draggable="true"
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', String(item.id));
                      e.dataTransfer.effectAllowed = 'copy';
                    }}
                    onClick={() => handleSingleClickNode(item.id)}
                    onDoubleClick={() => handleDoubleClickNode(item.id)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all flex flex-col gap-1.5 cursor-grab active:cursor-grabbing ${
                      isHighlighted
                        ? isLight ? 'bg-indigo-50 border-primary text-slate-900 shadow' : 'bg-primary/15 border-primary text-white shadow-md'
                        : isLight ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/2 hover:bg-white/5 border-white/5 text-text-muted hover:text-white'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className={`text-xs font-bold line-clamp-2 leading-snug ${isLight ? 'text-slate-900' : 'text-white'}`}>{item.checklist_name}</span>
                      {hasRelations ? (
                        <span className="shrink-0 text-[10px] font-black uppercase tracking-wider bg-indigo-500/10 border border-indigo-500/30 text-indigo-600 px-2 py-0.5 rounded-md">
                          Linked
                        </span>
                      ) : (
                        <span className="shrink-0 text-[10px] font-black uppercase tracking-wider bg-slate-500/10 border border-slate-500/30 text-slate-500 px-2 py-0.5 rounded-md">
                          Standalone
                        </span>
                      )}
                    </div>

                    <div className={`flex items-center justify-between text-xs font-semibold mt-0.5 ${isLight ? 'text-slate-600' : 'text-text-sub'}`}>
                      <span className="font-bold">{item.input_type}</span>
                      <span className={`px-2 py-0.5 rounded-md font-bold ${isLight ? 'bg-slate-100 text-slate-800 border border-slate-200' : 'bg-white/5 text-white'}`}>
                        {item.total_count ?? 0} response{(item.total_count ?? 0) !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                );
              })
            )
          ) : leftTab === 'templates' ? (
            filteredTemplates.length === 0 ? (
              <p className={`text-xs text-center py-8 ${isLight ? 'text-slate-500' : 'text-text-muted'}`}>No templates match your search.</p>
            ) : (
              filteredTemplates.map(tmpl => {
                const isFilterActive = selectedGroupFilter?.type === 'template' && selectedGroupFilter?.name === tmpl.template_name;
                return (
                  <button
                    key={tmpl.id}
                    onClick={() => {
                      if (isFilterActive) {
                        setSelectedGroupFilter(null);
                      } else {
                        setSelectedGroupFilter({ type: 'template', name: tmpl.template_name });
                        setLeftTab('items');
                      }
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer ${
                      isFilterActive
                        ? isLight ? 'bg-emerald-50 border-emerald-500 text-slate-900' : 'bg-emerald-500/15 border-emerald-500/40 text-white'
                        : isLight ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/2 hover:bg-white/5 border-white/5 text-text-muted hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-extrabold line-clamp-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>{tmpl.template_name}</span>
                      <span className="shrink-0 text-[8px] font-black uppercase bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 px-1.5 py-0.5 rounded">
                        {tmpl.itemIds.length} items
                      </span>
                    </div>
                    <div className={`flex items-center justify-between text-[9px] font-semibold ${isLight ? 'text-slate-600' : 'text-text-sub'}`}>
                      <span className="text-amber-600 font-bold">#{tmpl.tag_name}</span>
                      <span className="text-primary font-bold">Filter →</span>
                    </div>
                  </button>
                );
              })
            )
          ) : (
            filteredTags.length === 0 ? (
              <p className={`text-xs text-center py-8 ${isLight ? 'text-slate-500' : 'text-text-muted'}`}>No tags match your search.</p>
            ) : (
              filteredTags.map(tg => {
                const isFilterActive = selectedGroupFilter?.type === 'tag' && selectedGroupFilter?.name === tg.tag_name;
                return (
                  <button
                    key={tg.id}
                    onClick={() => {
                      if (isFilterActive) {
                        setSelectedGroupFilter(null);
                      } else {
                        setSelectedGroupFilter({ type: 'tag', name: tg.tag_name });
                        setLeftTab('items');
                      }
                    }}
                    className={`w-full text-left p-2.5 rounded-xl border transition-all flex flex-col gap-1 cursor-pointer ${
                      isFilterActive
                        ? isLight ? 'bg-amber-50 border-amber-500 text-slate-900' : 'bg-amber-500/15 border-amber-500/40 text-white'
                        : isLight ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800' : 'bg-white/2 hover:bg-white/5 border-white/5 text-text-muted hover:text-white'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-extrabold line-clamp-1 ${isLight ? 'text-slate-900' : 'text-white'}`}>#{tg.tag_name}</span>
                      <span className="shrink-0 text-[8px] font-black uppercase bg-amber-500/10 border border-amber-500/20 text-amber-600 px-1.5 py-0.5 rounded">
                        {tg.itemIds.length} items
                      </span>
                    </div>
                    <div className={`flex items-center justify-between text-[9px] font-semibold ${isLight ? 'text-slate-600' : 'text-text-sub'}`}>
                      <span>{tg.user_position || 'General'}</span>
                      <span className="text-primary font-bold">Filter →</span>
                    </div>
                  </button>
                );
              })
            )
          )}
        </div>


      </div>

      {/* Center Panel: SVG Graph Canvas */}
      <div className="flex-1 flex flex-col lg:flex-row gap-6 relative">
        <div
          className={`flex-1 border rounded-3xl relative overflow-hidden shadow-xl min-h-[350px] ${
            isLight ? 'bg-slate-50 border-slate-200' : 'bg-bg-card border-glass-border'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'copy';
          }}
          onDrop={handleCanvasDrop}
        >
          {/* Active 1-Click Connection Mode Banner */}
          {connectingParentNodeId && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 px-4 py-2 bg-primary text-white rounded-2xl shadow-2xl animate-bounce">
              <Link size={14} className="animate-spin" />
              <span className="text-xs font-black">
                Select a target node to set as Child of "{connectingParentItem?.checklist_name}"
              </span>
              <button
                onClick={() => setConnectingParentNodeId(null)}
                className="bg-white/20 hover:bg-white/30 text-white text-[10px] font-bold px-2 py-0.5 rounded-lg cursor-pointer ml-2"
              >
                Cancel
              </button>
            </div>
          )}

          {/* Top Bar Info & Canvas Actions */}
          <div className="absolute top-4 left-4 right-4 flex flex-wrap items-center justify-between gap-3 z-20 pointer-events-none">
            <div className={`backdrop-blur-md border px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-4 pointer-events-auto shadow-lg ${
              isLight ? 'bg-white/95 border-slate-200 text-slate-800' : 'bg-slate-900/90 border-white/10 text-white'
            }`}>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-indigo-500 shadow-sm shadow-indigo-500/50" /> KPI Metric Card</span>
              <span className="flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50" /> Details Selected</span>
            </div>

            <div className="flex items-center gap-2.5 pointer-events-auto relative">
              <button
                onClick={handleStartNewChart}
                className={`border px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                  isLight ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-900' : 'bg-slate-900/90 hover:bg-slate-900 border-white/10 text-white'
                }`}
                title="Saves active layout and opens a new blank chart view"
              >
                <FilePlus size={14} className="text-primary" /> New Chart View
              </button>

              {savedCharts.length > 0 && (
                <div className="relative">
                  <button
                    onClick={() => setShowSavedChartsMenu(!showSavedChartsMenu)}
                    className={`border px-3.5 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg ${
                      isLight ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900/90 hover:bg-slate-900 border-white/10 text-white'
                    }`}
                    title="View and switch between saved chart views"
                  >
                    <FolderOpen size={14} className="text-amber-500" /> Saved Views ({savedCharts.length}) <ChevronDown size={13} />
                  </button>

                  {showSavedChartsMenu && (
                    <div className={`absolute top-full right-0 mt-2 w-64 border rounded-2xl p-2 shadow-2xl z-50 backdrop-blur-xl animate-in fade-in duration-150 ${
                      isLight ? 'bg-white/98 border-slate-200 text-slate-900' : 'bg-slate-900/98 border-white/15 text-white'
                    }`}>
                      <div className="text-[10px] font-black uppercase tracking-wider text-text-muted px-2 py-1 border-b border-white/10 mb-1 flex items-center justify-between">
                        <span>Saved Chart Canvas Views</span>
                        <span className="text-primary">{savedCharts.length} Saved</span>
                      </div>
                      <div className="max-h-56 overflow-y-auto space-y-1 py-1">
                        {savedCharts.map(c => (
                          <div
                            key={c.id}
                            onClick={() => handleLoadSavedChart(c)}
                            className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                              isLight ? 'hover:bg-slate-100 text-slate-800' : 'hover:bg-white/10 text-white'
                            }`}
                          >
                            <div className="flex flex-col">
                              <span>{c.name}</span>
                              <span className="text-[10px] text-text-muted font-normal">{c.date} · {c.addedCanvasItemIds?.length || 0} nodes</span>
                            </div>
                            <button
                              onClick={(e) => handleDeleteSavedChart(c.id, e)}
                              className="text-text-muted hover:text-red-500 p-1 rounded-lg transition-colors cursor-pointer"
                              title="Delete saved chart"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <button
                onClick={handleAutoArrangeChart}
                className={`border px-4 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer shadow-lg ${
                  isLight
                    ? 'bg-indigo-50 hover:bg-indigo-100 border-indigo-200 text-indigo-700'
                    : 'bg-indigo-900/40 hover:bg-indigo-900/60 border-indigo-500/30 text-indigo-300'
                }`}
                title="Automatically align nodes into a clean, balanced hierarchical layout"
              >
                <LayoutGrid size={14} className="text-indigo-500" /> Auto-Arrange Chart
              </button>

              {(Object.keys(customPositions).length > 0 || addedCanvasItemIds.size > 0) && (
                <button
                  onClick={() => {
                    setCustomPositions({});
                    setAddedCanvasItemIds(new Set());
                  }}
                  className={`border px-3.5 py-2 rounded-2xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg ${
                    isLight ? 'bg-white hover:bg-slate-100 border-slate-200 text-amber-600' : 'bg-slate-900/90 hover:bg-slate-900 border-white/10 text-amber-400'
                  }`}
                  title="Reset custom layout positions"
                >
                  <RotateCcw size={13} /> Reset Layout
                </button>
              )}
            </div>
          </div>

          {/* SVG Graph Canvas */}
          <svg
            ref={svgRef}
            className="w-full h-full"
            style={{
              cursor: draggingCanvas.current ? 'grabbing' : 'grab',
              userSelect: 'none'
            }}
            onMouseDown={handleCanvasMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onWheel={handleWheel}
          >
            <defs>
              {/* Grid Background Pattern */}
              <pattern id="kpi-grid-pattern" width="36" height="36" patternUnits="userSpaceOnUse">
                <path d="M 36 0 L 0 0 0 36" fill="none" stroke={isLight ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.06)"} strokeWidth="1"/>
                <circle cx="36" cy="36" r="1.2" fill={isLight ? "rgba(0,0,0,0.15)" : "rgba(255,255,255,0.15)"} />
              </pattern>
              {/* Arrowhead Markers */}
              <marker
                id="arrowhead"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={isLight ? '#475569' : '#cbd5e1'} />
              </marker>
              <marker
                id="arrowhead-active"
                viewBox="0 0 10 10"
                refX="7"
                refY="5"
                markerWidth="8"
                markerHeight="8"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#6366f1" />
              </marker>
            </defs>

            {/* Grid Canvas Fill Rect */}
            <rect
              x={-20000}
              y={-20000}
              width={40000}
              height={40000}
              fill={isLight ? '#f1f5f9' : '#090d16'}
            />
            <rect
              x={-20000}
              y={-20000}
              width={40000}
              height={40000}
              fill="url(#kpi-grid-pattern)"
            />

            <g transform={`translate(${transform.x + (svgRef.current?.clientWidth ? svgRef.current.clientWidth / 2 : 350)}, ${transform.y + (svgRef.current?.clientHeight ? svgRef.current.clientHeight / 2 : 220)}) scale(${transform.scale})`}>
              
              {/* Edge Relationships */}
              {graphEdges.map(edge => {
                const isHovered = edge.parent.id === hoveredNodeId || edge.child.id === hoveredNodeId;
                const isEdgeHighlighted = edge.parent.id === highlightedNodeId || edge.child.id === highlightedNodeId;
                return (
                  <g key={edge.id}>
                    <path
                      d={makeEdgePath(edge.parent, edge.child)}
                      fill="none"
                      stroke={(isHovered || isEdgeHighlighted) ? '#6366f1' : (isLight ? 'rgba(71,85,105,0.45)' : 'rgba(255,255,255,0.22)')}
                      strokeWidth={(isHovered || isEdgeHighlighted) ? 2.5 : 1.5}
                      strokeDasharray={(isHovered || isEdgeHighlighted) ? 'none' : '4,4'}
                      markerEnd={(isHovered || isEdgeHighlighted) ? 'url(#arrowhead-active)' : 'url(#arrowhead)'}
                      className="transition-all duration-200"
                    />
                    {/* Delete Link Trigger Circle */}
                    <circle
                      cx={(edge.parent.x + edge.child.x) / 2}
                      cy={(edge.parent.y + edge.child.y) / 2}
                      r={8}
                      fill={isLight ? '#ffffff' : '#1e293b'}
                      stroke={isHovered ? '#ef4444' : (isLight ? 'rgba(0,0,0,0.2)' : 'rgba(255,255,255,0.2)')}
                      strokeWidth={1.5}
                      style={{ cursor: 'pointer' }}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLink(edge.id);
                      }}
                      title="Remove relationship connection"
                    />
                    <text
                      x={(edge.parent.x + edge.child.x) / 2}
                      y={(edge.parent.y + edge.child.y) / 2 + 3.5}
                      textAnchor="middle"
                      fill="#ef4444"
                      style={{ fontSize: 10, fontWeight: 900, cursor: 'pointer', pointerEvents: 'none' }}
                    >
                      ×
                    </text>
                  </g>
                );
              })}

              {/* Node Cards */}
              {graphNodes.map(node => {
                const styles = getNodeStyles(node);
                let accentColor = '#6366f1';
                if (node.id === detailsNodeId) accentColor = '#10b981';

                return (
                  <g
                    key={node.id}
                    data-node-id={node.id}
                    className="node-element"
                    transform={`translate(${node.x}, ${node.y})`}
                    style={{ cursor: 'grab' }}
                    onMouseDown={(e) => handleNodeMouseDown(e, node)}
                    onMouseEnter={() => setHoveredNodeId(node.id)}
                    onMouseLeave={() => setHoveredNodeId(null)}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSingleClickNode(node.id);
                    }}
                    onDoubleClick={(e) => {
                      e.stopPropagation();
                      handleDoubleClickNode(node.id);
                    }}
                  >
                    {/* Shadow */}
                    <rect x={-135} y={-43} width={270} height={86} rx={16} fill={isLight ? "rgba(0,0,0,0.06)" : "rgba(0,0,0,0.35)"} />
                    
                    {/* Main Node Box */}
                    <rect
                      x={-135}
                      y={-43}
                      width={270}
                      height={86}
                      rx={16}
                      fill={styles.bg}
                      stroke={styles.border}
                      strokeWidth={styles.isConnectingParent ? 3.5 : styles.isDetailsOpen ? 3 : styles.isHighlighted ? 2.5 : 1.5}
                      className="transition-all duration-150"
                    />

                    {/* Left Accent Strip */}
                    <path
                      d="M -135 -27 L -135 27 A 16 16 0 0 0 -119 43 L -119 43 L -119 -43 L -119 -43 A 16 16 0 0 0 -135 -27 Z"
                      fill={accentColor}
                    />

                    {/* Node Name */}
                    <text
                      x={-110}
                      y={-16}
                      fill={isLight ? '#0f172a' : '#ffffff'}
                      style={{ fontSize: 13, fontWeight: 800, fontFamily: 'Outfit,Inter,sans-serif' }}
                    >
                      {node.checklist_name.length > 32
                        ? node.checklist_name.slice(0, 30) + '...'
                        : node.checklist_name
                      }
                    </text>

                    {/* Node Type Metadata */}
                    <text
                      x={-110}
                      y={6}
                      fill={isLight ? '#475569' : '#94a3b8'}
                      style={{ fontSize: 11, fontWeight: 700, fontFamily: 'Outfit,Inter,sans-serif' }}
                    >
                      {node.input_type} Metric
                    </text>

                    {/* Node Aggregation & Response Count */}
                    <text
                      x={-110}
                      y={24}
                      fill={isLight ? '#64748b' : '#cbd5e1'}
                      style={{ fontSize: 10, fontWeight: 700, fontFamily: 'Outfit,Inter,sans-serif' }}
                    >
                      {node.aggregation} • {node.total_count ?? 0} response{(node.total_count ?? 0) !== 1 ? 's' : ''}
                    </text>

                    {/* Remove Node Button (Top Right of Card) */}
                    <g
                      transform="translate(118, -30)"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveNodeFromCanvas(node.id);
                      }}
                      title="Remove node from active canvas"
                      style={{ cursor: 'pointer' }}
                    >
                      <circle r={9} fill={isLight ? "#f1f5f9" : "#1e293b"} stroke={isLight ? "#cbd5e1" : "rgba(255,255,255,0.2)"} strokeWidth={1} />
                      <text x={0} y={3.5} textAnchor="middle" fill={isLight ? '#64748b' : '#94a3b8'} style={{ fontSize: 11, fontWeight: 900 }}>×</text>
                    </g>

                    {/* 1-Click Link Child Button on Node Card */}
                    <g
                      transform="translate(80, 10)"
                      onClick={(e) => {
                        e.stopPropagation();
                        setConnectingParentNodeId(node.id);
                        triggerNotification(`Connecting mode active: Click target metric to set as Child.`);
                      }}
                      title="Link another node as child of this metric"
                      style={{ cursor: 'pointer' }}
                    >
                      <rect
                        x={-37}
                        y={-12}
                        width={74}
                        height={24}
                        rx={8}
                        fill={isLight ? "#e0e7ff" : "rgba(99, 102, 241, 0.25)"}
                        stroke={isLight ? "#c7d2fe" : "rgba(99, 102, 241, 0.5)"}
                        strokeWidth={1}
                      />
                      <text
                        x={0}
                        y={3.5}
                        textAnchor="middle"
                        fill={isLight ? '#4338ca' : '#a5b4fc'}
                        style={{ fontSize: 10.5, fontWeight: 800, fontFamily: 'Outfit,Inter,sans-serif' }}
                      >
                        + Link Child
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Empty canvas guide */}
              {graphNodes.length === 0 && (
                <g transform="translate(0, 0)">
                  <text textAnchor="middle" fill={isLight ? '#64748b' : '#94a3b8'} style={{ fontSize: 13, fontWeight: 700 }}>
                    Select an item from the left panel or drag metrics onto the canvas to construct the KPI network.
                  </text>
                </g>
              )}
            </g>
          </svg>

          {/* SVG Controls: Pan & Zoom */}
          <div className={`absolute bottom-4 right-4 flex flex-col gap-1 p-1.5 border rounded-2xl shadow-xl backdrop-blur-md z-30 ${
            isLight ? 'bg-white/95 border-slate-200' : 'bg-slate-900/90 border-glass-border'
          }`}>
            <button onClick={zoomIn} title="Zoom In" className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
              isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-white'
            }`}>
              <Plus size={16} />
            </button>
            <button onClick={zoomOut} title="Zoom Out" className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
              isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-white'
            }`}>
              <Minus size={16} />
            </button>
            <div className={`h-px my-0.5 mx-1 ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
            <button onClick={resetView} title="Reset View" className={`p-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center ${
              isLight ? 'hover:bg-slate-100 text-slate-700' : 'hover:bg-white/10 text-white'
            }`}>
              <Maximize2 size={16} />
            </button>
          </div>
        </div>

        {/* Right Panel: KPI Node Details & Multi-Metric Combined Analytics */}
        {detailsItem && (
          <div className={`w-full lg:w-96 border rounded-3xl p-4 flex flex-col shadow-xl shrink-0 animate-in slide-in-from-right duration-200 ${
            isLight ? 'bg-white/95 border-slate-200 text-slate-900' : 'bg-bg-card border-glass-border text-white'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b mb-3 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
              <h4 className={`text-sm font-black uppercase tracking-wider ${isLight ? 'text-slate-900' : 'text-white'}`}>KPI Node Details</h4>
              <button onClick={() => setDetailsNodeId(null)} className={`text-xs font-extrabold px-2.5 py-1 rounded-lg transition-all cursor-pointer ${isLight ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-white/5 hover:bg-white/10 text-white'}`}>Close</button>
            </div>

            <div className="space-y-4 flex-1 overflow-y-auto pr-1 custom-scrollbar">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider bg-primary/10 border border-primary/20 text-primary px-2.5 py-0.5 rounded-md">
                  {detailsItem.input_type} Node
                </span>
                <h5 className={`text-base font-extrabold mt-1.5 leading-snug ${isLight ? 'text-slate-900' : 'text-white'}`}>{detailsItem.checklist_name}</h5>
              </div>

              {/* Response Stats */}
              <div className={`border rounded-2xl p-3.5 text-center ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/2 border-white/5'}`}>
                <span className={`text-xs font-bold uppercase block mb-0.5 ${isLight ? 'text-slate-600' : 'text-text-muted'}`}>Total Response Submissions</span>
                <span className={`text-lg font-black text-primary ${isLight ? 'text-slate-900' : 'text-white'}`}>{detailsItem.total_count ?? 0}</span>
              </div>

              {/* Preferred Granularity Period */}
              <div className={`border rounded-2xl p-3.5 space-y-2 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/2 border-slate-200'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                    <Calendar size={13} className="text-primary" /> Preferred Granularity
                  </span>
                  {savingPreference && (
                    <span className="text-xs text-accent animate-pulse font-bold flex items-center gap-1">
                      <RefreshCw size={10} className="animate-spin" /> Saving...
                    </span>
                  )}
                </div>
                <div className="relative">
                  <select
                    value={detailsItem.aggregation || 'Monthly'}
                    onChange={(e) => handleUpdatePreferredAggregation(e.target.value)}
                    disabled={savingPreference}
                    className={`w-full border rounded-xl px-3.5 py-2 text-xs font-bold outline-none cursor-pointer disabled:opacity-50 appearance-none ${
                      isLight ? 'bg-white border-slate-300 text-slate-900' : 'bg-slate-900/70 border-glass-border text-white'
                    }`}
                  >
                    <option value="Daily" className={isLight ? 'bg-white text-slate-900' : 'bg-[#0f172a] text-white'}>Daily</option>
                    <option value="Weekly" className={isLight ? 'bg-white text-slate-900' : 'bg-[#0f172a] text-white'}>Weekly</option>
                    <option value="Monthly" className={isLight ? 'bg-white text-slate-900' : 'bg-[#0f172a] text-white'}>Monthly</option>
                    <option value="Quarterly" className={isLight ? 'bg-white text-slate-900' : 'bg-[#0f172a] text-white'}>Quarterly</option>
                  </select>
                  <div className={`absolute right-3.5 top-3 pointer-events-none text-xs ${isLight ? 'text-slate-400' : 'text-text-muted'}`}>▼</div>
                </div>
              </div>

              {/* Analytics Trend Chart: Single vs Combined Multi-Metric */}
              <div className={`border rounded-2xl p-3.5 space-y-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-white/2 border-white/5'}`}>
                <div className="flex items-center justify-between">
                  <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                    <Activity size={13} className="text-accent" /> Performance Trend
                  </span>
                  
                  {/* Aggregation interval buttons */}
                  <div className={`flex border rounded-xl p-0.5 gap-0.5 ${isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'}`}>
                    {['Daily', 'Weekly', 'Monthly', 'Quarterly'].map((mode) => (
                      <button
                        key={mode}
                        type="button"
                        onClick={() => setCurrentAggregation(mode)}
                        className={`px-2 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                          currentAggregation === mode
                            ? 'bg-primary text-white shadow-sm'
                            : isLight ? 'text-slate-600 hover:text-slate-900' : 'text-text-muted hover:text-white'
                        }`}
                      >
                        {mode[0]}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Single vs Combined Overlay Chart Toggle */}
                {Object.keys(linkedAnalyticsMap).length > 0 && (
                  <div className={`flex items-center justify-between p-2 px-3 rounded-2xl border text-xs font-bold ${
                    isLight ? 'bg-white border-slate-200' : 'bg-white/3 border-white/5'
                  }`}>
                    <span className={isLight ? 'text-slate-700' : 'text-white'}>Multi-Metric View:</span>
                    <button
                      onClick={() => setIsCombinedView(prev => !prev)}
                      className={`px-3 py-1 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 text-xs font-extrabold ${
                        isCombinedView
                          ? 'bg-indigo-600 text-white shadow'
                          : isLight ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-white/5 text-text-muted hover:text-white'
                      }`}
                    >
                      {isCombinedView && <Check size={12} />}
                      {isCombinedView ? 'Overlay Linked Trends' : 'Show Combined Graph'}
                    </button>
                  </div>
                )}

                {selectedItemTrendLoading || combinedLoading ? (
                  <div className={`h-28 flex flex-col items-center justify-center gap-2 ${isLight ? 'text-slate-500' : 'text-text-muted'}`}>
                    <RefreshCw size={14} className="animate-spin text-accent" />
                    <span className="text-[10px] font-bold">Loading trend analytics...</span>
                  </div>
                ) : selectedItemTrendError ? (
                  <div className="h-28 flex items-center justify-center text-center p-2">
                    <p className="text-[9px] text-rose-500 font-semibold">{selectedItemTrendError}</p>
                  </div>
                ) : isCombinedView && combinedTrendData.length > 0 ? (
                  // Multi-Line Combined Overlaid Performance Chart
                  <div className="h-36 w-full -ml-4 pr-1 mt-1">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <LineChart data={combinedTrendData}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.03)'} vertical={false} />
                        <XAxis dataKey="period" stroke={isLight ? '#64748b' : 'rgba(255,255,255,0.4)'} fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke={isLight ? '#64748b' : 'rgba(255,255,255,0.4)'} fontSize={9} tickLine={false} axisLine={false} />
                        <RechartsTooltip content={<CustomTrendTooltip isLight={isLight} />} />
                        {/* Target Node Line */}
                        <Line
                          type="monotone"
                          dataKey="target"
                          name={detailsItem.checklist_name}
                          stroke="#10b981"
                          strokeWidth={2.5}
                          dot={{ r: 3, strokeWidth: 1 }}
                          activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                        />
                        {/* Linked Parent & Child Lines */}
                        {Object.values(linkedAnalyticsMap).map((lData, idx) => (
                          <Line
                            key={lData.id}
                            type="monotone"
                            dataKey={`node_${lData.id}`}
                            name={lData.name}
                            stroke={idx % 2 === 0 ? '#6366f1' : '#f59e0b'}
                            strokeDasharray="4 4"
                            strokeWidth={2}
                            dot={{ r: 3, strokeWidth: 1 }}
                            activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                          />
                        ))}
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  // Single Metric Performance Line Chart
                  <div className="h-32 w-full -ml-4 pr-2 mt-1">
                    <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={0}>
                      <LineChart data={selectedItemTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke={isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.03)'} vertical={false} />
                        <XAxis dataKey="period" stroke={isLight ? '#64748b' : 'rgba(255,255,255,0.4)'} fontSize={9} tickLine={false} axisLine={false} />
                        <YAxis stroke={isLight ? '#64748b' : 'rgba(255,255,255,0.4)'} fontSize={9} tickLine={false} axisLine={false} />
                        <RechartsTooltip content={<CustomTrendTooltip isLight={isLight} />} />
                        <Line
                          type="monotone"
                          dataKey="avg_value"
                          name={detailsItem.checklist_name}
                          stroke="#6366f1"
                          strokeWidth={2.5}
                          dot={{ r: 3, strokeWidth: 1 }}
                          activeDot={{ r: 6, strokeWidth: 2, stroke: '#fff' }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </div>

              {/* Linked Items Detailed Directory & Performance Cards */}
              <div className="space-y-4">
                {/* Parents (Linked Drivers) */}
                <div>
                  <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 mb-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                    <ArrowUp size={13} className="text-indigo-500" /> Linked Driver Checklist Items ({detailsItem.parent_ids?.length || 0})
                  </span>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {(detailsItem.parent_ids || []).map(pId => {
                      const pItem = items.find(i => i.id === pId);
                      if (!pItem) return null;
                      return (
                        <div
                          key={pId}
                          onClick={() => handleSingleClickNode(pId)}
                          onDoubleClick={() => handleDoubleClickNode(pId)}
                          className={`w-full text-left p-2.5 border rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between ${
                            isLight ? 'bg-white hover:bg-slate-100 border-slate-200' : 'bg-white/2 hover:bg-white/5 border-white/5'
                          }`}
                        >
                          <span className={`font-bold truncate max-w-[260px] ${isLight ? 'text-slate-900' : 'text-white'}`} title={pItem.checklist_name}>
                            {pItem.checklist_name}
                          </span>
                          <span className="text-indigo-600 font-extrabold shrink-0 bg-indigo-500/10 px-2 py-0.5 rounded text-[10px] border border-indigo-500/20">
                            {pItem.input_type}
                          </span>
                        </div>
                      );
                    })}
                    {(!detailsItem.parent_ids || detailsItem.parent_ids.length === 0) && (
                      <p className={`text-xs italic px-1 ${isLight ? 'text-slate-400' : 'text-text-muted/60'}`}>No driver checklist item relationships connected.</p>
                    )}
                  </div>
                </div>

                {/* Children (Dependent Metrics) */}
                <div>
                  <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 mb-2 ${isLight ? 'text-slate-800' : 'text-white'}`}>
                    <ArrowDown size={13} className="text-amber-500" /> Dependent Metric Checklist Items ({detailsItem.child_ids?.length || 0})
                  </span>
                  <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
                    {(detailsItem.child_ids || []).map(cId => {
                      const cItem = items.find(i => i.id === cId);
                      if (!cItem) return null;
                      return (
                        <div
                          key={cId}
                          onClick={() => handleSingleClickNode(cId)}
                          onDoubleClick={() => handleDoubleClickNode(cId)}
                          className={`w-full text-left p-2.5 border rounded-xl text-xs transition-all cursor-pointer flex items-center justify-between ${
                            isLight ? 'bg-white hover:bg-slate-100 border-slate-200' : 'bg-white/2 hover:bg-white/5 border-white/5'
                          }`}
                        >
                          <span className={`font-bold truncate max-w-[260px] ${isLight ? 'text-slate-900' : 'text-white'}`} title={cItem.checklist_name}>
                            {cItem.checklist_name}
                          </span>
                          <span className="text-amber-600 font-extrabold shrink-0 bg-amber-500/10 px-2 py-0.5 rounded text-[10px] border border-amber-500/20">
                            {cItem.input_type}
                          </span>
                        </div>
                      );
                    })}
                    {(!detailsItem.child_ids || detailsItem.child_ids.length === 0) && (
                      <p className={`text-xs italic px-1 ${isLight ? 'text-slate-400' : 'text-text-muted/60'}`}>No dependent metric checklist item relationships connected.</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Multi-Item Batch Relationship Link Creation Modal */}
      {isLinking && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <form onSubmit={handleBatchCreateLinks} className={`border rounded-3xl p-6 w-full max-w-lg space-y-4 shadow-2xl animate-in zoom-in-95 duration-200 ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'bg-[#0f172a] border-glass-border text-white'
          }`}>
            <div className={`flex items-center justify-between pb-3 border-b ${isLight ? 'border-slate-200' : 'border-white/5'}`}>
              <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-2 ${isLight ? 'text-slate-900' : 'text-white'}`}>
                <Link2 size={14} className="text-primary" />
                Batch Link KPI Relationships
              </h4>
              <button type="button" onClick={() => setIsLinking(false)} className={isLight ? 'text-slate-400 hover:text-slate-900' : 'text-text-muted hover:text-white'}>
                <X size={14} />
              </button>
            </div>

            <p className={`text-[10px] ${isLight ? 'text-slate-600' : 'text-text-muted'}`}>
              Connect a parent KPI metric to one or multiple child metrics at once to establish clear upstream and downstream relationships.
            </p>

            <div className="space-y-3">
              {/* Parent Selector */}
              <div className="space-y-1">
                <label className={`text-[10px] font-bold uppercase ${isLight ? 'text-slate-700' : 'text-text-muted'}`}>Parent KPI Item (Driver)</label>
                <select
                  value={linkParentId}
                  onChange={(e) => {
                    setLinkParentId(e.target.value);
                    setSelectedChildIds([]);
                  }}
                  className={`w-full border rounded-xl px-3 py-2 text-xs font-bold outline-none cursor-pointer ${
                    isLight ? 'bg-slate-50 border-slate-300 text-slate-900' : 'bg-white/5 border-glass-border text-white'
                  }`}
                  required
                >
                  <option value="" disabled className={isLight ? 'bg-white text-slate-900' : 'bg-[#0f172a] text-white'}>-- Select Parent Metric --</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id} className={isLight ? 'bg-white text-slate-900' : 'bg-[#0f172a] text-white'}>{item.checklist_name} ({item.input_type})</option>
                  ))}
                </select>
              </div>

              {/* Multi-Child Selection List */}
              {linkParentId && (
                <div className="space-y-2">
                  <div className={`flex items-center justify-between text-[10px] font-bold ${isLight ? 'text-slate-700' : 'text-text-muted'}`}>
                    <label className="uppercase">Select Child Metrics ({selectedChildIds.length} selected)</label>
                    <button
                      type="button"
                      onClick={() => {
                        const eligible = items.filter(i => String(i.id) !== String(linkParentId)).map(i => i.id);
                        if (selectedChildIds.length === eligible.length) {
                          setSelectedChildIds([]);
                        } else {
                          setSelectedChildIds(eligible);
                        }
                      }}
                      className="text-primary hover:underline cursor-pointer"
                    >
                      {selectedChildIds.length > 0 ? 'Deselect All' : 'Select All'}
                    </button>
                  </div>

                  <input
                    type="text"
                    placeholder="Search metrics to link..."
                    value={modalChildSearch}
                    onChange={(e) => setModalChildSearch(e.target.value)}
                    className={`w-full border rounded-xl px-3 py-1.5 text-[11px] font-bold outline-none ${
                      isLight ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400' : 'bg-white/5 border-white/10 text-white'
                    }`}
                  />

                  <div className={`max-h-48 overflow-y-auto space-y-1 pr-1 custom-scrollbar p-2 rounded-2xl border ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-slate-900/60 border-white/5'
                  }`}>
                    {items
                      .filter(item => String(item.id) !== String(linkParentId))
                      .filter(item => !modalChildSearch || item.checklist_name.toLowerCase().includes(modalChildSearch.toLowerCase()))
                      .map(item => {
                        const isChecked = selectedChildIds.includes(item.id);
                        return (
                          <div
                            key={item.id}
                            onClick={() => {
                              setSelectedChildIds(prev =>
                                isChecked ? prev.filter(id => id !== item.id) : [...prev, item.id]
                              );
                            }}
                            className={`p-2 rounded-xl border flex items-center justify-between text-xs font-bold cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-primary/20 border-primary text-primary font-black'
                                : isLight
                                ? 'bg-white hover:bg-slate-100 border-slate-200 text-slate-800'
                                : 'bg-white/2 hover:bg-white/5 border-white/5 text-text-muted hover:text-white'
                            }`}
                          >
                            <span className="truncate max-w-[280px]">{item.checklist_name}</span>
                            {isChecked ? <CheckSquare size={14} className="text-primary" /> : <Square size={14} className={isLight ? 'text-slate-400' : 'text-text-muted'} />}
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-2 justify-end pt-2">
              <button
                type="button"
                onClick={() => setIsLinking(false)}
                className={`px-4 py-2 border rounded-xl text-xs font-bold cursor-pointer ${
                  isLight ? 'bg-slate-100 hover:bg-slate-200 border-slate-300 text-slate-700' : 'bg-white/5 hover:bg-white/10 border-white/10 text-text-muted'
                }`}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={savingLink || selectedChildIds.length === 0}
                className="px-4 py-2 bg-primary hover:bg-primary/95 disabled:opacity-50 text-white rounded-xl text-xs font-bold cursor-pointer flex items-center gap-1.5"
              >
                {savingLink ? 'Linking...' : `Link ${selectedChildIds.length} Metric(s)`}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
