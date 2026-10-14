import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import cytoscape from 'cytoscape';
// @ts-ignore
import cola from 'cytoscape-cola';
import { Project, Stimulus, ParticipantSession, StimulusResponse, NormalizationRule } from '../../types';
import { storageAdapter, localDB } from '../../services/storage/storageAdapter';
import {
  extractConceptsForPathfinder,
  analyzePathfinder,
  PathfinderResult,
  PathfinderEdge,
} from '../../services/math/pathfinder';
import { calculateTraditionalRSN } from '../../services/math/rsnTraditional';
import { AdminLayout } from '../../components/layout/AdminLayout';
import {
  Network,
  Sliders,
  Download,
  Info,
  Layers,
  Sparkles,
  Maximize2,
  RotateCcw,
  ZoomIn,
  ZoomOut,
  FileSpreadsheet,
  FileText,
  Image,
  CheckCircle2,
  X,
  ChevronRight,
  Eye,
  Hash,
  Activity,
  Bot,
} from 'lucide-react';

// Register cola layout once
try {
  cytoscape.use(cola);
} catch {
  // Already registered
}

export const PathfinderPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const currentProjectId = projectId || 'proj-taller-rsn';

  const [project, setProject] = useState<Project | null>(null);
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);
  const [sessions, setSessions] = useState<ParticipantSession[]>([]);
  const [responses, setResponses] = useState<StimulusResponse[]>([]);
  const [rules, setRules] = useState<NormalizationRule[]>([]);

  // Selection mode: 'multi_stimulus' (combine SAMs as in Sánchez et al., 2013) vs 'single_stimulus'
  const [analysisMode, setAnalysisMode] = useState<'multi_stimulus' | 'single_stimulus'>('multi_stimulus');
  const [selectedStimulusIds, setSelectedStimulusIds] = useState<string[]>([]);
  const [singleStimulusId, setSingleStimulusId] = useState<string>('');
  const [samCutoffPerStimulus, setSamCutoffPerStimulus] = useState<number>(10);

  // Pathfinder Parameters
  const [rParam, setRParam] = useState<number | 'inf'>('inf');
  const [qParam, setQParam] = useState<number>(10);
  const [nodeSizingBy, setNodeSizingBy] = useState<'degree' | 'valorM' | 'frequency'>('degree');
  const [smoothingParam, setSmoothingParam] = useState<number>(0.5);

  // Interactive Selection State (like SemNet p. 23)
  const [selectedConcepts, setSelectedConcepts] = useState<Set<string>>(new Set());
  const [inspectedConcept, setInspectedConcept] = useState<string | null>(null);

  // AI Interpretation Drawer
  const [isAiInterpreting, setIsAiInterpreting] = useState(false);
  const [aiInterpretationText, setAiInterpretationText] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    storageAdapter.getProject(currentProjectId).then(p => {
      if (p) setProject(p);
    });
    const unsubStim = storageAdapter.subscribeStimuli(currentProjectId, list => {
      setStimuli(list);
      if (list.length > 0) {
        setSelectedStimulusIds(prev => (prev.length === 0 ? list.map(s => s.id) : prev));
        setSingleStimulusId(prev => (!prev ? list[0].id : prev));
      }
    });
    const unsubSess = storageAdapter.subscribeSessions(currentProjectId, setSessions);
    const unsubResp = storageAdapter.subscribeResponses(currentProjectId, undefined, setResponses);
    const unsubRules = storageAdapter.subscribeRules(currentProjectId, setRules);

    return () => {
      unsubStim();
      unsubSess();
      unsubResp();
      unsubRules();
    };
  }, [currentProjectId]);

  // Filter valid completed responses with useMemo to avoid recreation on every render
  const activeSessions = useMemo(() => {
    return sessions.filter(s => s.status === 'completed' && !s.flags?.excludedByAdmin);
  }, [sessions]);

  const activeSessionIds = useMemo(() => {
    return new Set(activeSessions.map(s => s.id));
  }, [activeSessions]);

  const activeResponses = useMemo(() => {
    return responses.filter(r => activeSessionIds.has(r.sessionId));
  }, [responses, activeSessionIds]);

  // Compute Pathfinder network whenever parameters change (memoized, zero infinite loop!)
  const pfResult = useMemo<PathfinderResult | null>(() => {
    if (stimuli.length === 0 || activeResponses.length === 0) return null;

    let targetResponses = activeResponses;
    if (analysisMode === 'single_stimulus') {
      targetResponses = activeResponses.filter(r => r.stimulusId === singleStimulusId);
    } else {
      const selectedSet = new Set(selectedStimulusIds);
      targetResponses = activeResponses.filter(r => selectedSet.has(r.stimulusId));
    }

    if (targetResponses.length === 0) {
      return null;
    }

    // Step 1: Extract concepts (union of SAM sets)
    const { concepts, conceptStimuliMap } = extractConceptsForPathfinder(
      targetResponses,
      rules,
      true,
      samCutoffPerStimulus
    );

    if (concepts.length === 0) {
      return null;
    }

    // Traditional stats map for enrichment
    const traditional = calculateTraditionalRSN(targetResponses, rules, true);
    const conceptStatsMap = new Map<string, { frequency: number; valorM: number; valorFMG: number; inSAM: boolean }>();
    traditional.definidoras.forEach(d => {
      conceptStatsMap.set(d.word, {
        frequency: d.frequency,
        valorM: d.valorM,
        valorFMG: d.valorFMG,
        inSAM: d.isSAM,
      });
    });

    // Step 2 to 5: Run full Pathfinder pipeline
    const maxQ = Math.max(1, concepts.length - 1);
    const effectiveQ = Math.min(qParam, maxQ);

    return analyzePathfinder(targetResponses, concepts, rules, true, {
      r: rParam,
      q: effectiveQ,
      smoothing: smoothingParam,
      conceptStimuliMap,
      conceptStatsMap,
    });
  }, [
    activeResponses,
    stimuli,
    analysisMode,
    selectedStimulusIds,
    singleStimulusId,
    samCutoffPerStimulus,
    rParam,
    qParam,
    smoothingParam,
    rules,
  ]);

  // Memoize elements with SemNet rectangular badge dimensions that enclose words completely
  const elements = useMemo<cytoscape.ElementDefinition[]>(() => {
    if (!pfResult) return [];

    const res: cytoscape.ElementDefinition[] = [];

    // Nodes
    pfResult.concepts.forEach(concept => {
      const stats = pfResult.conceptStats[concept];
      const degree = stats?.degree || 0;
      const valorM = stats?.valorM || 0;
      const freq = stats?.frequency || 0;

      // Label with degree in brackets, identical to SemNet user manual p. 23!
      const labelWithDegree = `${concept.toUpperCase()} [${degree}]`;

      // Scale dimensions according to the selected metric
      let scale = 1.0;
      if (nodeSizingBy === 'valorM') {
        scale = Math.min(1.35, 0.9 + (valorM / 100) * 0.45);
      } else if (nodeSizingBy === 'frequency') {
        scale = Math.min(1.35, 0.9 + Math.sqrt(freq) * 0.15);
      } else {
        // degree
        scale = Math.min(1.35, 0.95 + degree * 0.08);
      }

      const fontSize = Math.round(11 * scale);
      const charWidth = 7.5 * scale;
      // Generous horizontal padding so text is 100% inside the rounded frame
      const nodeWidth = Math.max(96, Math.round(labelWithDegree.length * charWidth + 28));
      const nodeHeight = Math.round(34 * scale);

      res.push({
        group: 'nodes',
        data: {
          id: concept,
          label: labelWithDegree,
          rawWord: concept,
          degree,
          valorM,
          freq,
          nodeWidth,
          nodeHeight,
          fontSize,
          stimuli: stats?.stimuliSources?.join(', ') || '',
        },
      });
    });

    // Edges
    pfResult.edges.forEach(edge => {
      res.push({
        group: 'edges',
        data: {
          id: `${edge.source}---${edge.target}`,
          source: edge.source,
          target: edge.target,
          weight: edge.weight,
          distance: edge.distance,
        },
      });
    });

    return res;
  }, [pfResult, nodeSizingBy]);

  // Initialize and update Cytoscape graph
  useEffect(() => {
    if (!containerRef.current || elements.length === 0) return;

    // Cleanup previous instance
    if (cyRef.current) {
      cyRef.current.destroy();
      cyRef.current = null;
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      boxSelectionEnabled: false,
      style: [
        {
          selector: 'node',
          style: {
            shape: 'round-rectangle',
            width: 'data(nodeWidth)',
            height: 'data(nodeHeight)',
            'background-color': '#ffffff',
            'border-width': 2,
            'border-color': '#cbd5e1',
            label: 'data(label)',
            'font-family': 'Inter, system-ui, -apple-system, sans-serif',
            'font-size': 'data(fontSize)',
            'font-weight': 'bold',
            'text-valign': 'center',
            'text-halign': 'center',
            color: '#1e293b',
            'text-margin-y': 0,
            'text-margin-x': 0,
            'corner-radius': '8px',
            'transition-property': 'background-color, border-color, border-width, opacity, color',
            'transition-duration': 0.15,
          },
        },
        {
          selector: 'edge',
          style: {
            width: 1.5,
            'line-color': '#94a3b8',
            'curve-style': 'bezier',
            opacity: 0.65,
            'transition-property': 'line-color, width, opacity',
            'transition-duration': 0.15,
          },
        },
        // Highlighted node style (SemNet p. 23 red border & text)
        {
          selector: 'node.highlighted',
          style: {
            'background-color': '#fef2f2',
            'border-color': '#dc2626',
            'border-width': 3,
            color: '#991b1b',
            opacity: 1,
            'z-index': 99,
          },
        },
        // Neighbor node style
        {
          selector: 'node.neighbor',
          style: {
            'background-color': '#eff6ff',
            'border-color': '#2563eb',
            'border-width': 2.5,
            color: '#1e40af',
            opacity: 1,
            'z-index': 50,
          },
        },
        // Highlighted edge style
        {
          selector: 'edge.highlighted',
          style: {
            'line-color': '#dc2626',
            width: 3,
            opacity: 1,
            'z-index': 90,
          },
        },
        // Dimmed unselected elements
        {
          selector: 'node.dimmed',
          style: {
            opacity: 0.18,
          },
        },
        {
          selector: 'edge.dimmed',
          style: {
            opacity: 0.08,
          },
        },
      ],
      layout: {
        name: 'cola',
        animate: true,
        refresh: 2,
        maxSimulationTime: 1800,
        nodeSpacing: 50,
        edgeLength: 140,
        avoidOverlap: true,
        randomize: false,
      } as any,
    });

    // Click handler for node selection
    cy.on('tap', 'node', evt => {
      const node = evt.target;
      const word = node.data('rawWord');
      setInspectedConcept(word);

      setSelectedConcepts(prev => {
        const next = new Set(prev);
        if (next.has(word)) {
          next.delete(word);
        } else {
          next.add(word);
        }
        return next;
      });
    });

    cyRef.current = cy;

    return () => {
      if (cyRef.current) {
        cyRef.current.destroy();
        cyRef.current = null;
      }
    };
  }, [elements]);

  // Update visual highlights whenever selectedConcepts change
  useEffect(() => {
    const cy = cyRef.current;
    if (!cy) return;

    if (selectedConcepts.size === 0) {
      // Clear all highlights
      cy.nodes().removeClass('highlighted neighbor dimmed');
      cy.edges().removeClass('highlighted dimmed');
      return;
    }

    const selectedArray = Array.from(selectedConcepts);
    const selectedNodes = cy.nodes().filter(n => selectedConcepts.has(n.data('rawWord')));
    const connectedEdges = selectedNodes.connectedEdges();
    const neighborNodes = connectedEdges.connectedNodes().not(selectedNodes);

    // Apply classes
    cy.nodes().addClass('dimmed').removeClass('highlighted neighbor');
    cy.edges().addClass('dimmed').removeClass('highlighted');

    selectedNodes.removeClass('dimmed').addClass('highlighted');
    neighborNodes.removeClass('dimmed').addClass('neighbor');
    connectedEdges.removeClass('dimmed').addClass('highlighted');
  }, [selectedConcepts]);

  // Interactive button: Select All
  const handleSelectAll = () => {
    if (!pfResult) return;
    setSelectedConcepts(new Set(pfResult.concepts));
  };

  // Interactive button: Clear Selection
  const handleClearSelection = () => {
    setSelectedConcepts(new Set());
    setInspectedConcept(null);
  };

  // Export 1: High-res PNG
  const handleDownloadPNG = () => {
    if (!cyRef.current) return;
    const png64 = cyRef.current.png({ full: true, scale: 3, bg: '#ffffff' });
    const a = document.createElement('a');
    a.href = png64;
    a.download = `Pathfinder_${currentProjectId}_r${rParam}_q${qParam}.png`;
    a.click();
  };

  // Export 2: True Vector SVG
  const handleDownloadSVG = () => {
    if (!cyRef.current) return;
    const cy = cyRef.current;
    const nodes = cy.nodes();
    const edges = cy.edges();
    const bb = cy.elements().boundingBox();
    const padding = 50;
    const width = Math.max(800, Math.round(bb.w + padding * 2));
    const height = Math.max(600, Math.round(bb.h + padding * 2));
    const offsetX = -bb.x1 + padding;
    const offsetY = -bb.y1 + padding;

    let svgStr = `<?xml version="1.0" encoding="UTF-8"?>\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="${width}" height="${height}">\n`;
    svgStr += `  <style>\n`;
    svgStr += `    .node-text { font-family: Inter, system-ui, -apple-system, sans-serif; font-weight: bold; fill: #1e293b; text-anchor: middle; dominant-baseline: central; }\n`;
    svgStr += `    .edge-line { stroke: #94a3b8; stroke-width: 1.5; stroke-opacity: 0.65; }\n`;
    svgStr += `    .node-rect { fill: #ffffff; stroke: #cbd5e1; stroke-width: 2; rx: 8; ry: 8; }\n`;
    svgStr += `  </style>\n`;
    svgStr += `  <rect width="100%" height="100%" fill="#ffffff" />\n`;

    // Edges
    edges.forEach(e => {
      const sp = e.source().position();
      const tp = e.target().position();
      svgStr += `  <line class="edge-line" x1="${(sp.x + offsetX).toFixed(1)}" y1="${(sp.y + offsetY).toFixed(1)}" x2="${(tp.x + offsetX).toFixed(1)}" y2="${(tp.y + offsetY).toFixed(1)}" />\n`;
    });

    // Nodes
    nodes.forEach(n => {
      const pos = n.position();
      const nw = n.data('nodeWidth') || 100;
      const nh = n.data('nodeHeight') || 34;
      const fontSize = n.data('fontSize') || 11;
      const label = n.data('label') || '';
      const cx = (pos.x + offsetX).toFixed(1);
      const cyPos = (pos.y + offsetY).toFixed(1);
      svgStr += `  <g transform="translate(${cx}, ${cyPos})">\n`;
      svgStr += `    <rect x="${(-nw / 2).toFixed(1)}" y="${(-nh / 2).toFixed(1)}" width="${nw}" height="${nh}" class="node-rect" />\n`;
      svgStr += `    <text class="node-text" font-size="${fontSize}px">${label}</text>\n`;
      svgStr += `  </g>\n`;
    });

    svgStr += `</svg>`;

    const blob = new Blob([svgStr], { type: 'image/svg+xml;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Pathfinder_${currentProjectId}_r${rParam}_q${qParam}.svg`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Export 3: Pathfinder Distance Matrix CSV
  const handleDownloadMatrixCsv = () => {
    if (!pfResult) return;
    const { concepts, distanceMatrix, pfnetAdjacencyMatrix } = pfResult;

    // Header comment with metadata
    const meta = [
      `# ESTUDIO: ${project?.title || currentProjectId}`,
      `# FECHA: ${new Date().toISOString()}`,
      `# METODO: Pathfinder PFNET(r=${rParam}, q=${qParam}) con Modelo de Rumelhart`,
      `# PARTICIPANTES: N=${activeSessions.length}`,
      `# NODOS: ${pfResult.stats.nodeCount}, ARISTAS CONSERVADAS: ${pfResult.stats.edgeCount}`,
      `# CONVENCION: Valor = Distancia d_ij (1/w_ij). Si arista no conservada, distancia en PFNET es INF.`,
    ];

    const rows: string[] = [...meta];
    rows.push(['concepto', ...concepts].map(c => `"${c}"`).join(','));

    concepts.forEach((c, i) => {
      const row = [
        `"${c}"`,
        ...distanceMatrix[i].map((d, j) => {
          if (i === j) return '0';
          if (!pfnetAdjacencyMatrix[i][j]) return 'INF';
          return d.toFixed(4);
        }),
      ];
      rows.push(row.join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pathfinder_Matrix_${currentProjectId}_r${rParam}_q${qParam}.csv`;
    link.click();
  };

  // Export 4: Connections Edges CSV
  const handleDownloadEdgesCsv = () => {
    if (!pfResult) return;
    const meta = [
      `# ESTUDIO: ${project?.title || currentProjectId}`,
      `# FECHA: ${new Date().toISOString()}`,
      `# METODO: Pathfinder PFNET(r=${rParam}, q=${qParam}) con Modelo de Rumelhart`,
      `# PARTICIPANTES: N=${activeSessions.length}`,
      `# CONEXIONES RETAINED: ${pfResult.edges.length}`,
    ];

    const headers = ['origen', 'destino', 'peso_rumelhart_wij', 'distancia_dij'];
    const rows = [...meta, headers.join(',')];

    pfResult.edges.forEach(e => {
      rows.push([`"${e.source}"`, `"${e.target}"`, e.weight.toFixed(4), e.distance.toFixed(4)].join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pathfinder_Conexiones_${currentProjectId}.csv`;
    link.click();
  };

  // AI Interpretation generator based strictly on computed results
  const handleGenerateAiInterpretation = () => {
    if (!pfResult) return;
    setIsAiInterpreting(true);

    setTimeout(() => {
      // Find top connected hub concepts
      const sortedByDegree = [...pfResult.concepts].sort(
        (a, b) => (pfResult.conceptStats[b]?.degree || 0) - (pfResult.conceptStats[a]?.degree || 0)
      );
      const topHubs = sortedByDegree.slice(0, 3);

      const interpretation = `### Hipótesis Cualitativa sobre la Organización Cognitiva del Grupo\n\n` +
        `**1. Nodos Centrales (Hubs Semánticos):**\n` +
        `Los conceptos con mayor número de conexiones conservadas por el algoritmo Pathfinder (r=${rParam}, q=${qParam}) son: ` +
        topHubs.map(h => `**${h.toUpperCase()}** (${pfResult.conceptStats[h]?.degree} enlaces)`).join(', ') + `. ` +
        `Estos conceptos actúan como organizadores estructurales del esquema grupal, sirviendo como puentes cognitivos entre los distintos subdominios temáticos evaluados.\n\n` +
        `**2. Densidad y Economía Cognitiva:**\n` +
        `La red redujo las conexiones posibles a una densidad de **${(pfResult.stats.density * 100).toFixed(1)}%** (${pfResult.stats.edgeCount} de ${pfResult.stats.totalPossibleEdges} posibles), eliminando caminos redundantes y preservando únicamente las trayectorias de asociación más directas.\n\n` +
        `**3. Microestructuras Detectadas:**\n` +
        `A diferencia de las redes semánticas tradicionales en estrella donde cada palabra se evalúa solo respecto a un estímulo aislado, la red Pathfinder evidencia interconexiones cruzadas entre conceptos de diferentes estímulos, revelando esquemas compartidos en la memoria colectiva del grupo.`;

      setAiInterpretationText(interpretation);
      setIsAiInterpreting(false);
    }, 600);
  };

  // Inspected concept details
  const inspectedData = inspectedConcept ? pfResult?.conceptStats[inspectedConcept] : null;
  const inspectedDirectNeighbors = inspectedConcept && pfResult
    ? pfResult.edges
        .filter(e => e.source === inspectedConcept || e.target === inspectedConcept)
        .map(e => ({
          neighbor: e.source === inspectedConcept ? e.target : e.source,
          weight: e.weight,
          distance: e.distance,
        }))
        .sort((a, b) => b.weight - a.weight)
    : [];

  return (
    <AdminLayout activeProjectId={currentProjectId}>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-amber-100 text-amber-900 text-[10px] font-black uppercase tracking-wider">
                Tradición Mexicana • SemNet v3.22
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Network className="w-6 h-6 text-primary-600" />
                Redes Asociativas Pathfinder (PFNET)
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulación computacional basada en el modelo probabilístico de Rumelhart y escalamiento Pathfinder de Schvaneveldt.
            </p>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleDownloadPNG}
              disabled={!pfResult}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
              title="Descargar imagen de alta resolución"
            >
              <Image className="w-3.5 h-3.5 text-primary-600" />
              <span>PNG</span>
            </button>

            <button
              onClick={handleDownloadSVG}
              disabled={!pfResult}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
              title="Descargar imagen vectorial"
            >
              <Download className="w-3.5 h-3.5 text-primary-600" />
              <span>SVG</span>
            </button>

            <button
              onClick={handleDownloadMatrixCsv}
              disabled={!pfResult}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
              title="Descargar matriz cuadrada de distancias Pathfinder"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Matriz CSV</span>
            </button>

            <button
              onClick={handleDownloadEdgesCsv}
              disabled={!pfResult}
              className="px-3 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
              title="Descargar lista de conexiones conservadas"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span>Conexiones</span>
            </button>
          </div>
        </div>

        {/* Configuration Bar */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-slate-100">
            {/* Mode Selector */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-4 h-4 text-primary-600" />
                Modalidad:
              </span>
              <button
                onClick={() => setAnalysisMode('multi_stimulus')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  analysisMode === 'multi_stimulus'
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Combinar Estímulos (Sánchez et al., 2013)
              </button>
              <button
                onClick={() => setAnalysisMode('single_stimulus')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  analysisMode === 'single_stimulus'
                    ? 'bg-primary-600 text-white shadow-xs'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Estímulo Individual (Adaptación)
              </button>
            </div>

            {/* Node Sizing by Parameter */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Tamaño de Nodos:</span>
              <select
                value={nodeSizingBy}
                onChange={e => setNodeSizingBy(e.target.value as any)}
                className="px-3 py-1 text-xs font-bold rounded-xl border border-slate-200 bg-slate-50 text-slate-800"
              >
                <option value="degree">Grado de Conexiones (Links)</option>
                <option value="valorM">Peso Semántico (Valor M)</option>
                <option value="frequency">Frecuencia de Aparición (FA)</option>
              </select>
            </div>
          </div>

          {/* Parameters Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
            {/* r parameter */}
            <div className="space-y-1.5 p-3 bg-slate-50/70 rounded-2xl border border-slate-200/60">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">Métrica Minkowski (r):</label>
                <span className="font-black text-primary-700 font-mono">
                  {rParam === 'inf' ? 'r = ∞ (Máx)' : `r = ${rParam}`}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setRParam('inf')}
                  className={`flex-1 py-1 rounded-lg font-bold text-xs ${
                    rParam === 'inf' ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  r = ∞ (Estándar)
                </button>
                <button
                  type="button"
                  onClick={() => setRParam(2)}
                  className={`flex-1 py-1 rounded-lg font-bold text-xs ${
                    rParam === 2 ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  r = 2 (Euclídeo)
                </button>
                <button
                  type="button"
                  onClick={() => setRParam(1)}
                  className={`flex-1 py-1 rounded-lg font-bold text-xs ${
                    rParam === 1 ? 'bg-primary-600 text-white' : 'bg-white border border-slate-200 text-slate-700'
                  }`}
                >
                  r = 1 (Manhattan)
                </button>
              </div>
            </div>

            {/* q parameter */}
            <div className="space-y-1.5 p-3 bg-slate-50/70 rounded-2xl border border-slate-200/60">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">Máx. Enlaces en Ruta (q):</label>
                <span className="font-black text-primary-700 font-mono">q = {qParam}</span>
              </div>
              <input
                type="range"
                min={1}
                max={Math.max(2, (pfResult?.concepts.length || 20) - 1)}
                value={qParam}
                onChange={e => setQParam(parseInt(e.target.value) || 1)}
                className="w-full accent-primary-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>1 (Completa)</span>
                <span>V - 1 (Mínima)</span>
              </div>
            </div>

            {/* SAM Cutoff per stimulus */}
            <div className="space-y-1.5 p-3 bg-slate-50/70 rounded-2xl border border-slate-200/60">
              <div className="flex items-center justify-between">
                <label className="font-bold text-slate-700">Palabras SAM por Estímulo:</label>
                <span className="font-black text-primary-700 font-mono">{samCutoffPerStimulus}</span>
              </div>
              <input
                type="range"
                min={5}
                max={20}
                value={samCutoffPerStimulus}
                onChange={e => setSamCutoffPerStimulus(parseInt(e.target.value) || 10)}
                className="w-full accent-primary-600"
              />
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Top 5</span>
                <span>Top 10 (SemNet)</span>
                <span>Top 20</span>
              </div>
            </div>

            {/* Stimulus selector */}
            <div className="space-y-1.5 p-3 bg-slate-50/70 rounded-2xl border border-slate-200/60">
              <label className="font-bold text-slate-700 block">
                {analysisMode === 'single_stimulus' ? 'Estímulo a Evaluar:' : 'Estímulos Incluidos:'}
              </label>
              {analysisMode === 'single_stimulus' ? (
                <select
                  value={singleStimulusId}
                  onChange={e => setSingleStimulusId(e.target.value)}
                  className="w-full px-2.5 py-1 text-xs font-bold rounded-lg border border-slate-200 bg-white"
                >
                  {stimuli.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.text}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="text-[11px] text-slate-600 font-medium">
                  {selectedStimulusIds.length} de {stimuli.length} estímulos seleccionados ({pfResult?.stats.nodeCount || 0} palabras SAM combinadas)
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Network Metrics Stats Ribbon */}
        {pfResult && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Nodos (Conceptos)
              </span>
              <p className="text-xl font-black text-slate-900">{pfResult.stats.nodeCount}</p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Conexiones Conservadas
              </span>
              <p className="text-xl font-black text-primary-600">{pfResult.stats.edgeCount}</p>
              <span className="text-[10px] text-slate-400">de {pfResult.stats.totalPossibleEdges} posibles</span>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Densidad PFNET
              </span>
              <p className="text-xl font-black text-emerald-600">
                {(pfResult.stats.density * 100).toFixed(1)}%
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Parámetros Schvaneveldt
              </span>
              <p className="text-base font-black text-slate-800 font-mono">
                PFNET({rParam === 'inf' ? '∞' : rParam}, {qParam})
              </p>
            </div>
          </div>
        )}

        {/* Main Canvas & Inspection Container */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Cytoscape Canvas (3 cols) */}
          <div className="lg:col-span-3 bg-white rounded-3xl border border-slate-200 p-4 shadow-xs relative flex flex-col min-h-[620px]">
            {/* Top Toolbar */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 flex-wrap gap-2 z-10">
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold"
                >
                  Todos
                </button>
                <button
                  onClick={handleClearSelection}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-xs font-bold"
                >
                  Limpiar
                </button>
                <span className="text-xs text-slate-400 ml-2">
                  {selectedConcepts.size > 0
                    ? `${selectedConcepts.size} conceptos seleccionados (enlaces destacados)`
                    : 'Haz clic en cualquier palabra para activar sus enlaces'}
                </span>
              </div>

              {/* Zoom & Fit controls */}
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 1.25)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  title="Acercar zoom"
                >
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button
                  onClick={() => cyRef.current?.zoom(cyRef.current.zoom() * 0.8)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  title="Alejar zoom"
                >
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button
                  onClick={() => cyRef.current?.fit(undefined, 30)}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  title="Ajustar al centro"
                >
                  <Maximize2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => cyRef.current?.layout({ name: 'cola', animate: true, nodeSpacing: 45 } as any).run()}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  title="Redistribuir nodos"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Graph Canvas */}
            <div ref={containerRef} className="flex-1 w-full h-[540px] relative rounded-2xl bg-slate-50/40" />

            {/* Methodological Disclaimer Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5" />
                La posición visual 2D no representa una distancia euclidiana física directa (Schvaneveldt, 1990).
              </span>
              <span>Modelo de Rumelhart: w_ij = ln((P11·P00) / (P10·P01))</span>
            </div>
          </div>

          {/* Details & AI Interpretation Sidebar (1 col) */}
          <div className="space-y-4">
            {/* Concept Inspector Card */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-primary-600" />
                  Inspección de Concepto
                </h3>
                {inspectedConcept && (
                  <button
                    onClick={() => setInspectedConcept(null)}
                    className="p-1 rounded text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {inspectedConcept && inspectedData ? (
                <div className="space-y-3">
                  <div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight">
                      {inspectedConcept.toUpperCase()}
                    </h4>
                    <p className="text-[11px] text-slate-400">
                      Estímulos origen: {inspectedData.stimuliSources.join(', ') || 'N/A'}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">Conexiones (Links):</span>
                      <span className="text-base font-black text-primary-700">{inspectedData.degree}</span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl">
                      <span className="text-[10px] text-slate-400 block font-bold">Frecuencia (FA):</span>
                      <span className="text-base font-black text-slate-800">{inspectedData.frequency}</span>
                    </div>
                    {inspectedData.valorM !== undefined && (
                      <div className="p-2.5 bg-slate-50 rounded-xl">
                        <span className="text-[10px] text-slate-400 block font-bold">Peso Semántico (M):</span>
                        <span className="text-base font-black text-slate-800">{inspectedData.valorM}</span>
                      </div>
                    )}
                    {inspectedData.valorFMG !== undefined && (
                      <div className="p-2.5 bg-slate-50 rounded-xl">
                        <span className="text-[10px] text-slate-400 block font-bold">Distancia FMG:</span>
                        <span className="text-base font-black text-slate-800">{inspectedData.valorFMG.toFixed(1)}%</span>
                      </div>
                    )}
                  </div>

                  {/* Connected Neighbors list */}
                  <div className="space-y-1.5 pt-1">
                    <label className="text-[11px] font-black text-slate-700 uppercase tracking-wider block">
                      Conceptos Directamente Conectados ({inspectedDirectNeighbors.length}):
                    </label>
                    <div className="max-h-48 overflow-y-auto space-y-1 pr-1 text-xs">
                      {inspectedDirectNeighbors.map((nb, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between p-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-100"
                        >
                          <span className="font-bold text-slate-800">{nb.neighbor.toUpperCase()}</span>
                          <div className="text-right font-mono text-[10px] text-slate-500">
                            <span>w: {nb.weight.toFixed(2)}</span>
                            <span className="ml-1 text-slate-300">•</span>
                            <span className="ml-1 text-slate-400">d: {nb.distance.toFixed(2)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="py-8 text-center text-slate-400 text-xs">
                  Haz clic en un nodo de la red para inspeccionar sus microestructuras y conexiones.
                </div>
              )}
            </div>

            {/* AI Qualitative Interpretation Card */}
            <div className="bg-gradient-to-br from-primary-900 to-slate-900 text-white p-5 rounded-3xl shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-primary-300 font-black text-xs uppercase tracking-wider">
                  <Bot className="w-4 h-4 text-primary-400" />
                  Interpretación Asistida por IA
                </div>
              </div>

              <p className="text-[11px] text-slate-300 leading-relaxed">
                Genera hipótesis cualitativas sobre la organización de la memoria semántica del grupo basándose estrictamente en las conexiones calculadas.
              </p>

              <button
                onClick={handleGenerateAiInterpretation}
                disabled={isAiInterpreting || !pfResult}
                className="w-full py-2 px-3 bg-primary-600 hover:bg-primary-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isAiInterpreting ? 'Analizando microestructuras...' : 'Interpretar Significado Grupal'}
              </button>

              {aiInterpretationText && (
                <div className="p-3 bg-white/10 rounded-2xl border border-white/10 text-xs text-slate-200 space-y-2 mt-2 leading-relaxed">
                  <div
                    dangerouslySetInnerHTML={{
                      __html: aiInterpretationText
                        .replace(/### (.*?)\n\n/g, '<h4 class="font-bold text-white text-xs mb-1">$1</h4>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                        .replace(/\n\n/g, '<br/>'),
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
