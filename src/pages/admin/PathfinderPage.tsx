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
  const currentProjectId = projectId || '';

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
  const [hoveredConcept, setHoveredConcept] = useState<string | null>(null);

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
  const applyCorrections = project?.settings?.includeCorrectionsInAnalysis !== false;

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
      applyCorrections,
      samCutoffPerStimulus
    );

    if (concepts.length === 0) {
      return null;
    }

    // Traditional stats map for enrichment
    const traditional = calculateTraditionalRSN(targetResponses, rules, applyCorrections);
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

    return analyzePathfinder(targetResponses, concepts, rules, applyCorrections, {
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
    applyCorrections,
  ]);

  // SVG Data URI for shared bicolor nodes (split left blue, right orange)
  const splitBgUri = useMemo(() => {
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100" preserveAspectRatio="none">
  <rect x="0" y="0" width="50" height="100" fill="#bfdbfe" />
  <rect x="50" y="0" width="50" height="100" fill="#fed7aa" />
  <line x1="50" y1="0" x2="50" y2="100" stroke="#94a3b8" stroke-width="1.5" />
</svg>`;
    if (typeof window !== 'undefined' && typeof window.btoa === 'function') {
      return `data:image/svg+xml;base64,${window.btoa(svg)}`;
    }
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  }, []);

  // Classify concepts by stimulus membership (Stimulus 1, Stimulus 2, Shared)
  const stimulusClassification = useMemo(() => {
    if (stimuli.length === 0) {
      return {
        stim1: null,
        stim2: null,
        conceptMembership: new Map<string, 'stimulus1' | 'stimulus2' | 'shared'>(),
        stim1ConceptStats: new Map<string, { freq: number; valorM: number }>(),
        stim2ConceptStats: new Map<string, { freq: number; valorM: number }>(),
      };
    }

    const stim1 = stimuli[0];
    const stim2 = stimuli.length > 1 ? stimuli[1] : stimuli[0];

    // Compute traditional RSN stats for each stimulus separately
    const stim1Responses = activeResponses.filter(r => r.stimulusId === stim1.id);
    const stim2Responses = stimuli.length > 1 ? activeResponses.filter(r => r.stimulusId === stim2.id) : [];

    const trad1 = calculateTraditionalRSN(stim1Responses, rules, applyCorrections);
    const trad2 = calculateTraditionalRSN(stim2Responses, rules, applyCorrections);

    const stim1ConceptStats = new Map<string, { freq: number; valorM: number }>();
    trad1.definidoras.forEach(d => {
      stim1ConceptStats.set(d.word, { freq: d.frequency, valorM: d.valorM });
    });

    const stim2ConceptStats = new Map<string, { freq: number; valorM: number }>();
    trad2.definidoras.forEach(d => {
      stim2ConceptStats.set(d.word, { freq: d.frequency, valorM: d.valorM });
    });

    const wordsIn1 = new Set(trad1.definidoras.map(d => d.word));
    const wordsIn2 = new Set(trad2.definidoras.map(d => d.word));

    const conceptMembership = new Map<string, 'stimulus1' | 'stimulus2' | 'shared'>();

    if (pfResult) {
      pfResult.concepts.forEach(concept => {
        const in1 = wordsIn1.has(concept);
        const in2 = wordsIn2.has(concept);

        if (in1 && in2) {
          conceptMembership.set(concept, 'shared');
        } else if (in1) {
          conceptMembership.set(concept, 'stimulus1');
        } else if (in2) {
          conceptMembership.set(concept, 'stimulus2');
        } else {
          // Fallback checking stimuliSources from pfResult
          const sources = pfResult.conceptStats[concept]?.stimuliSources || [];
          const matches1 = sources.some(s => s.toLowerCase() === stim1.text.toLowerCase() || s === stim1.id);
          const matches2 = sources.some(s => s.toLowerCase() === stim2.text.toLowerCase() || s === stim2.id);
          if (matches1 && matches2) {
            conceptMembership.set(concept, 'shared');
          } else if (matches1) {
            conceptMembership.set(concept, 'stimulus1');
          } else if (matches2) {
            conceptMembership.set(concept, 'stimulus2');
          } else {
            conceptMembership.set(concept, 'shared');
          }
        }
      });
    }

    return {
      stim1,
      stim2,
      conceptMembership,
      stim1ConceptStats,
      stim2ConceptStats,
    };
  }, [stimuli, activeResponses, rules, applyCorrections, pfResult]);

  const stim1Name = stimulusClassification.stim1?.text || 'Estímulo 1';
  const stim2Name = stimulusClassification.stim2?.text || 'Estímulo 2';
  const hasTwoStimuli = stimuli.length >= 2;

  const stim1OnlyCount = useMemo(() => {
    return Array.from(stimulusClassification.conceptMembership.values()).filter(m => m === 'stimulus1').length;
  }, [stimulusClassification]);

  const stim2OnlyCount = useMemo(() => {
    return Array.from(stimulusClassification.conceptMembership.values()).filter(m => m === 'stimulus2').length;
  }, [stimulusClassification]);

  const sharedCount = useMemo(() => {
    return Array.from(stimulusClassification.conceptMembership.values()).filter(m => m === 'shared').length;
  }, [stimulusClassification]);

  const handleHighlightByMembership = (membershipType: 'stimulus1' | 'stimulus2' | 'shared') => {
    if (!pfResult) return;
    const matching = pfResult.concepts.filter(
      c => stimulusClassification.conceptMembership.get(c) === membershipType
    );
    setSelectedConcepts(new Set(matching));
    if (matching.length > 0) {
      setInspectedConcept(matching[0]);
    }
  };

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
      const membership = stimulusClassification.conceptMembership.get(concept) || 'shared';

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
          membership,
          stimuli: stats?.stimuliSources?.join(', ') || '',
        },
        classes: `membership-${membership}`,
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
  }, [pfResult, nodeSizingBy, stimulusClassification]);

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
        // Stimulus 1 exclusive node (Soft Blue)
        {
          selector: 'node.membership-stimulus1',
          style: {
            'background-color': '#dbeafe',
            'border-color': '#2563eb',
            'border-width': 2,
            color: '#1e3a8a',
          },
        },
        // Stimulus 2 exclusive node (Soft Orange)
        {
          selector: 'node.membership-stimulus2',
          style: {
            'background-color': '#ffedd5',
            'border-color': '#ea580c',
            'border-width': 2,
            color: '#7c2d12',
          },
        },
        // Shared node (Bicolor split: left blue, right orange)
        {
          selector: 'node.membership-shared',
          style: {
            'background-color': '#fed7aa',
            'background-image': splitBgUri,
            'background-fit': 'cover',
            'background-clip': 'node',
            'border-color': '#7c3aed',
            'border-width': 2.5,
            color: '#0f172a',
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
        // Highlighted node style (preserves background color / split, bold red border)
        {
          selector: 'node.highlighted',
          style: {
            'border-color': '#dc2626',
            'border-width': 3.5,
            opacity: 1,
            'z-index': 99,
          },
        },
        // Neighbor node style
        {
          selector: 'node.neighbor',
          style: {
            'border-color': '#0284c7',
            'border-width': 2.5,
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
            opacity: 0.2,
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
        animate: false,
        refresh: 1,
        maxSimulationTime: 1000,
        nodeSpacing: 50,
        edgeLength: 140,
        avoidOverlap: true,
        randomize: false,
      } as any,
    });

    // Hover handler for node
    cy.on('mouseover', 'node', evt => {
      const node = evt.target;
      const word = node.data('rawWord');
      setHoveredConcept(word);
    });

    cy.on('mouseout', 'node', () => {
      setHoveredConcept(null);
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
    svgStr += `    .node-text { font-family: Inter, system-ui, -apple-system, sans-serif; font-weight: bold; text-anchor: middle; dominant-baseline: central; }\n`;
    svgStr += `    .edge-line { stroke: #94a3b8; stroke-width: 1.5; stroke-opacity: 0.65; }\n`;
    svgStr += `  </style>\n`;
    svgStr += `  <defs>\n`;
    svgStr += `    <linearGradient id="splitGradient" x1="0%" y1="0%" x2="100%" y2="0%">\n`;
    svgStr += `      <stop offset="50%" stop-color="#bfdbfe" />\n`;
    svgStr += `      <stop offset="50%" stop-color="#fed7aa" />\n`;
    svgStr += `    </linearGradient>\n`;
    svgStr += `  </defs>\n`;
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
      const membership = n.data('membership') || 'shared';
      const cx = (pos.x + offsetX).toFixed(1);
      const cyPos = (pos.y + offsetY).toFixed(1);

      let fill = '#ffffff';
      let stroke = '#cbd5e1';
      let textColor = '#1e293b';

      if (membership === 'stimulus1') {
        fill = '#dbeafe';
        stroke = '#2563eb';
        textColor = '#1e3a8a';
      } else if (membership === 'stimulus2') {
        fill = '#ffedd5';
        stroke = '#ea580c';
        textColor = '#7c2d12';
      } else if (membership === 'shared') {
        fill = 'url(#splitGradient)';
        stroke = '#7c3aed';
        textColor = '#0f172a';
      }

      svgStr += `  <g transform="translate(${cx}, ${cyPos})">\n`;
      svgStr += `    <rect x="${(-nw / 2).toFixed(1)}" y="${(-nh / 2).toFixed(1)}" width="${nw}" height="${nh}" rx="8" ry="8" fill="${fill}" stroke="${stroke}" stroke-width="2" />\n`;
      if (membership === 'shared') {
        svgStr += `    <line x1="0" y1="${(-nh / 2).toFixed(1)}" x2="0" y2="${(nh / 2).toFixed(1)}" stroke="#94a3b8" stroke-width="1.5" />\n`;
      }
      svgStr += `    <text class="node-text" font-size="${fontSize}px" fill="${textColor}">${label}</text>\n`;
      svgStr += `  </g>\n`;
    });

    // Add Legend in exported SVG if 2 stimuli
    if (hasTwoStimuli) {
      svgStr += `  <g transform="translate(30, 25)">\n`;
      svgStr += `    <rect x="0" y="0" width="18" height="18" rx="4" fill="#dbeafe" stroke="#2563eb" stroke-width="1.5" />\n`;
      svgStr += `    <text x="26" y="14" font-family="Inter, sans-serif" font-size="12px" font-weight="bold" fill="#1e3a8a">${stim1Name} (${stim1OnlyCount})</text>\n`;
      svgStr += `    <rect x="180" y="0" width="18" height="18" rx="4" fill="#ffedd5" stroke="#ea580c" stroke-width="1.5" />\n`;
      svgStr += `    <text x="206" y="14" font-family="Inter, sans-serif" font-size="12px" font-weight="bold" fill="#7c2d12">${stim2Name} (${stim2OnlyCount})</text>\n`;
      svgStr += `    <rect x="360" y="0" width="18" height="18" rx="4" fill="url(#splitGradient)" stroke="#7c3aed" stroke-width="1.5" />\n`;
      svgStr += `    <text x="386" y="14" font-family="Inter, sans-serif" font-size="12px" font-weight="bold" fill="#0f172a">Compartida (${sharedCount})</text>\n`;
      svgStr += `  </g>\n`;
    }

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
                  onClick={() => cyRef.current?.layout({ name: 'cola', animate: false, nodeSpacing: 45 } as any).run()}
                  className="p-1.5 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                  title="Redistribuir nodos"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Stimulus Membership Legend & Filter Bar */}
            <div className="py-2.5 px-3 bg-slate-50/90 rounded-2xl border border-slate-100 my-2 flex flex-wrap items-center justify-between gap-3 text-xs z-10">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-slate-700 flex items-center gap-1.5 text-[11px] uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-primary-600" />
                  Origen de Palabras:
                </span>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Stimulus 1 */}
                  <button
                    onClick={() => handleHighlightByMembership('stimulus1')}
                    className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-blue-50 hover:bg-blue-100/80 border border-blue-200 text-blue-900 transition-colors shadow-2xs group"
                    title={`Filtrar palabras exclusivas de ${stim1Name}`}
                  >
                    <span className="w-3.5 h-3.5 rounded-md bg-blue-200 border border-blue-600 group-hover:scale-110 transition-transform shadow-2xs" />
                    <span className="font-extrabold">{stim1Name}</span>
                    <span className="text-[10px] font-mono bg-blue-200/70 text-blue-800 px-1.5 py-0.2 rounded-md font-bold">
                      {stim1OnlyCount}
                    </span>
                  </button>

                  {/* Stimulus 2 (if 2 stimuli available) */}
                  {hasTwoStimuli && (
                    <button
                      onClick={() => handleHighlightByMembership('stimulus2')}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-orange-50 hover:bg-orange-100/80 border border-orange-200 text-orange-950 transition-colors shadow-2xs group"
                      title={`Filtrar palabras exclusivas de ${stim2Name}`}
                    >
                      <span className="w-3.5 h-3.5 rounded-md bg-orange-200 border border-orange-600 group-hover:scale-110 transition-transform shadow-2xs" />
                      <span className="font-extrabold">{stim2Name}</span>
                      <span className="text-[10px] font-mono bg-orange-200/70 text-orange-900 px-1.5 py-0.2 rounded-md font-bold">
                        {stim2OnlyCount}
                      </span>
                    </button>
                  )}

                  {/* Shared / Bicolor (if 2 stimuli available) */}
                  {hasTwoStimuli && (
                    <button
                      onClick={() => handleHighlightByMembership('shared')}
                      className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-purple-50 hover:bg-purple-100/80 border border-purple-200 text-purple-950 transition-colors shadow-2xs group"
                      title="Filtrar palabras compartidas entre ambos estímulos"
                    >
                      <span className="w-4 h-3.5 rounded-md border border-purple-600 overflow-hidden flex group-hover:scale-110 transition-transform shadow-2xs">
                        <span className="w-1/2 h-full bg-[#bfdbfe]" />
                        <span className="w-1/2 h-full bg-[#fed7aa]" />
                      </span>
                      <span className="font-extrabold">Compartida (Bicolor)</span>
                      <span className="text-[10px] font-mono bg-purple-200/70 text-purple-900 px-1.5 py-0.2 rounded-md font-bold">
                        {sharedCount}
                      </span>
                    </button>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-400 font-medium hidden sm:block">
                Haz clic en una categoría para aislarla en el grafo
              </div>
            </div>

            {/* Graph Canvas Container */}
            <div className="relative flex-1 w-full h-[540px]">
              {/* Floating Hover Tooltip */}
              {hoveredConcept && (
                <div className="absolute top-3 left-3 z-30 bg-slate-900/95 text-white backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-xl border border-slate-700/80 pointer-events-none transition-all animate-in fade-in zoom-in-95 duration-100 flex items-center gap-2.5">
                  <div className="flex items-center gap-2">
                    {stimulusClassification.conceptMembership.get(hoveredConcept) === 'shared' ? (
                      <span className="w-3.5 h-3.5 rounded-md border border-purple-400 overflow-hidden flex shadow-xs">
                        <span className="w-1/2 h-full bg-[#bfdbfe]" />
                        <span className="w-1/2 h-full bg-[#fed7aa]" />
                      </span>
                    ) : stimulusClassification.conceptMembership.get(hoveredConcept) === 'stimulus1' ? (
                      <span className="w-3.5 h-3.5 rounded-md bg-[#bfdbfe] border border-blue-500 shadow-xs" />
                    ) : (
                      <span className="w-3.5 h-3.5 rounded-md bg-[#fed7aa] border border-orange-500 shadow-xs" />
                    )}
                    <span className="font-black text-sm uppercase tracking-wide text-white">
                      {hoveredConcept}
                    </span>
                  </div>

                  <span className="text-slate-500">•</span>

                  <span className="text-xs font-semibold text-slate-300">
                    {stimulusClassification.conceptMembership.get(hoveredConcept) === 'shared'
                      ? `Compartida (${stim1Name} y ${stim2Name})`
                      : stimulusClassification.conceptMembership.get(hoveredConcept) === 'stimulus1'
                      ? `Solo ${stim1Name}`
                      : `Solo ${stim2Name}`}
                  </span>

                  <span className="text-slate-500">•</span>

                  <span className="text-xs font-mono text-primary-400 font-bold">
                    {pfResult?.conceptStats[hoveredConcept]?.degree || 0} enlaces
                  </span>
                </div>
              )}

              <div ref={containerRef} className="w-full h-full relative rounded-2xl bg-slate-50/40" />
            </div>

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
                    {/* Stimulus membership badge */}
                    <div className="mt-1.5">
                      {stimulusClassification.conceptMembership.get(inspectedConcept) === 'shared' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-purple-50 text-purple-950 border border-purple-200 text-xs font-bold shadow-2xs">
                          <span className="w-3 h-3 rounded-sm border border-purple-500 overflow-hidden flex shadow-2xs">
                            <span className="w-1/2 h-full bg-[#bfdbfe]" />
                            <span className="w-1/2 h-full bg-[#fed7aa]" />
                          </span>
                          Compartida ({stim1Name} y {stim2Name})
                        </div>
                      ) : stimulusClassification.conceptMembership.get(inspectedConcept) === 'stimulus1' ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50 text-blue-900 border border-blue-200 text-xs font-bold shadow-2xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                          Solo {stim1Name}
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-orange-50 text-orange-950 border border-orange-200 text-xs font-bold shadow-2xs">
                          <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                          Solo {stim2Name}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Comparative Presence Breakdown per Stimulus */}
                  {hasTwoStimuli && (
                    <div className="p-3 bg-slate-50/80 rounded-2xl border border-slate-100 space-y-1.5 text-xs">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                        Presencia por Estímulo:
                      </span>
                      <div className="grid grid-cols-2 gap-2">
                        {/* Stimulus 1 */}
                        <div className="p-2 rounded-xl bg-blue-50/70 border border-blue-100">
                          <span className="font-bold text-blue-900 block truncate text-[11px]">{stim1Name}</span>
                          <div className="text-[10px] text-slate-600 mt-1 font-mono">
                            <span>FA: <strong className="text-blue-950">{stimulusClassification.stim1ConceptStats.get(inspectedConcept)?.freq || 0}</strong></span>
                            <span className="mx-1 text-slate-300">•</span>
                            <span>M: <strong className="text-blue-950">{stimulusClassification.stim1ConceptStats.get(inspectedConcept)?.valorM || 0}</strong></span>
                          </div>
                        </div>

                        {/* Stimulus 2 */}
                        <div className="p-2 rounded-xl bg-orange-50/70 border border-orange-100">
                          <span className="font-bold text-orange-950 block truncate text-[11px]">{stim2Name}</span>
                          <div className="text-[10px] text-slate-600 mt-1 font-mono">
                            <span>FA: <strong className="text-orange-950">{stimulusClassification.stim2ConceptStats.get(inspectedConcept)?.freq || 0}</strong></span>
                            <span className="mx-1 text-slate-300">•</span>
                            <span>M: <strong className="text-orange-950">{stimulusClassification.stim2ConceptStats.get(inspectedConcept)?.valorM || 0}</strong></span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

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
