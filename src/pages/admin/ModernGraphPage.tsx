import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Project, Stimulus, StimulusResponse, NormalizationRule, GraphNode } from '../../types';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { calculateTraditionalRSN } from '../../services/math/rsnTraditional';
import { calculateModernGraph } from '../../services/math/graphAnalysis';
import { AdminLayout } from '../../components/layout/AdminLayout';
import cytoscape from 'cytoscape';
// @ts-ignore
import cola from 'cytoscape-cola';
import {
  Share2,
  Sliders,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  Search,
  Sparkles,
  Info,
  ChevronDown,
  Layers,
  CircleDot,
  Network,
} from 'lucide-react';

try {
  cytoscape.use(cola);
} catch {
  // Cola already registered
}

// Distinct color palette for Louvain communities
const COMMUNITY_COLORS = [
  '#0e8ce9', // primary blue
  '#10b981', // emerald
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#ec4899', // pink
  '#14b8a6', // teal
  '#f97316', // orange
  '#6366f1', // indigo
];

export const ModernGraphPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);
  const [selectedStimulusId, setSelectedStimulusId] = useState<string>('');
  const [responses, setResponses] = useState<StimulusResponse[]>([]);
  const [rules, setRules] = useState<NormalizationRule[]>([]);

  // Network Configuration
  const [networkModel, setNetworkModel] = useState<'cooccurrence' | 'stimulus_star'>('cooccurrence');
  const [edgeThreshold, setEdgeThreshold] = useState<number>(1);
  const [nodeSizingMetric, setNodeSizingMetric] = useState<'frequency' | 'degree' | 'betweenness'>('frequency');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!projectId) return;

    storageAdapter.getProject(projectId).then(setProject);
    const unsubStim = storageAdapter.subscribeStimuli(projectId, list => {
      setStimuli(list);
      if (list.length > 0 && !selectedStimulusId) {
        setSelectedStimulusId(list[0].id);
      }
    });
    const unsubRules = storageAdapter.subscribeRules(projectId, setRules);

    return () => {
      unsubStim();
      unsubRules();
    };
  }, [projectId]);

  useEffect(() => {
    if (!projectId || !selectedStimulusId) return;
    const unsubResp = storageAdapter.subscribeResponses(
      projectId,
      selectedStimulusId,
      setResponses
    );
    return () => unsubResp();
  }, [projectId, selectedStimulusId]);

  // Calculations
  const traditionalAnalysis = useMemo(() => {
    if (responses.length === 0) return null;
    return calculateTraditionalRSN(responses, rules, true);
  }, [responses, rules]);

  const modernAnalysis = useMemo(() => {
    if (responses.length === 0) return null;
    return calculateModernGraph(responses, rules, true, edgeThreshold);
  }, [responses, rules, edgeThreshold]);

  const currentStimulus = stimuli.find(s => s.id === selectedStimulusId);

  // Initialize and Render Cytoscape Canvas
  useEffect(() => {
    if (!containerRef.current) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    let elements: cytoscape.ElementDefinition[] = [];

    if (networkModel === 'stimulus_star' && traditionalAnalysis && currentStimulus) {
      // Model A: Star Network (Stimulus to Definidoras)
      elements.push({
        data: {
          id: 'stimulus_center',
          label: currentStimulus.text,
          type: 'stimulus',
          size: 55,
          color: '#1e293b',
        },
      });

      traditionalAnalysis.definidoras.forEach(d => {
        const color = d.isNucleo ? '#10b981' : d.isSAM ? '#6366f1' : '#94a3b8';
        const size = Math.max(25, Math.min(50, 20 + d.valorFMG * 0.3));

        elements.push({
          data: {
            id: d.word,
            label: d.word,
            type: 'definidora',
            size,
            color,
            m: d.valorM,
            fmg: d.valorFMG,
            freq: d.frequency,
            isNucleo: d.isNucleo,
            isSAM: d.isSAM,
          },
        });

        elements.push({
          data: {
            id: `edge_${d.word}`,
            source: 'stimulus_center',
            target: d.word,
            weight: d.valorFMG,
            width: Math.max(1, Math.min(6, (d.valorFMG / 100) * 6)),
          },
        });
      });
    } else if (networkModel === 'cooccurrence' && modernAnalysis) {
      // Model B: Co-occurrence Network
      modernAnalysis.nodes.forEach(node => {
        let size = 26;
        if (nodeSizingMetric === 'frequency') {
          size = Math.max(22, Math.min(48, 18 + node.frequency * 4));
        } else if (nodeSizingMetric === 'degree') {
          size = Math.max(22, Math.min(48, 18 + node.degree * 3));
        } else if (nodeSizingMetric === 'betweenness') {
          size = Math.max(22, Math.min(52, 20 + node.betweennessCentrality * 60));
        }

        const color = COMMUNITY_COLORS[node.communityId % COMMUNITY_COLORS.length];

        elements.push({
          data: {
            id: node.id,
            label: node.label,
            size,
            color,
            freq: node.frequency,
            degree: node.degree,
            betweenness: node.betweennessCentrality,
            closeness: node.closenessCentrality,
            community: node.communityId,
            rawNode: node,
          },
        });
      });

      modernAnalysis.edges.forEach((edge, idx) => {
        elements.push({
          data: {
            id: `cooc_${idx}`,
            source: edge.source,
            target: edge.target,
            weight: edge.weight,
            jaccard: edge.jaccard,
            width: Math.max(1, Math.min(6, edge.weight * 1.5)),
          },
        });
      });
    }

    const cy = cytoscape({
      container: containerRef.current,
      elements,
      style: [
        {
          selector: 'node',
          style: {
            label: 'data(label)',
            width: 'data(size)',
            height: 'data(size)',
            'background-color': 'data(color)',
            color: '#1e293b',
            'font-family': 'Inter, sans-serif',
            'font-size': '11px',
            'font-weight': 'bold',
            'text-valign': 'bottom',
            'text-margin-y': 5,
            'text-background-opacity': 0.85,
            'text-background-color': '#ffffff',
            'text-background-padding': '3px',
            'text-background-shape': 'roundrectangle',
            'border-width': 2,
            'border-color': '#ffffff',
            'transition-property': 'background-color, line-color, target-arrow-color',
            'transition-duration': 150,
          },
        },
        {
          selector: 'node[type = "stimulus"]',
          style: {
            shape: 'diamond',
            color: '#ffffff',
            'text-background-color': '#0f172a',
            'text-background-opacity': 0.9,
            'font-size': '13px',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 'data(width)',
            'line-color': '#cbd5e1',
            'curve-style': 'bezier',
            opacity: 0.65,
          },
        },
        {
          selector: ':selected',
          style: {
            'border-width': 4,
            'border-color': '#0e8ce9',
            'line-color': '#0e8ce9',
            opacity: 1,
          },
        },
      ],
      layout: {
        name: networkModel === 'stimulus_star' ? 'concentric' : 'cola',
        animate: true,
        refresh: 1,
        maxSimulationTime: 1500,
        nodeSpacing: 35,
      } as any,
    });

    cy.on('tap', 'node', evt => {
      const nodeData = evt.target.data();
      if (nodeData.rawNode) {
        setSelectedNode(nodeData.rawNode);
      } else {
        setSelectedNode({
          id: nodeData.id,
          label: nodeData.label,
          frequency: nodeData.freq || 0,
          valorM: nodeData.m,
          valorFMG: nodeData.fmg,
          degree: 0,
          weightedDegree: 0,
          betweennessCentrality: 0,
          closenessCentrality: 0,
          communityId: 0,
          isNucleo: nodeData.isNucleo,
        });
      }
    });

    cy.on('tap', evt => {
      if (evt.target === cy) {
        setSelectedNode(null);
      }
    });

    cyRef.current = cy;
  }, [networkModel, traditionalAnalysis, modernAnalysis, currentStimulus, nodeSizingMetric]);

  // Search Filter
  useEffect(() => {
    if (!cyRef.current || !searchTerm.trim()) {
      cyRef.current?.nodes().style({ opacity: 1 });
      return;
    }
    const term = searchTerm.toLowerCase();
    cyRef.current.nodes().forEach(node => {
      const label = String(node.data('label')).toLowerCase();
      if (label.includes(term)) {
        node.style({ opacity: 1 });
        node.select();
      } else {
        node.style({ opacity: 0.2 });
        node.unselect();
      }
    });
  }, [searchTerm]);

  const handleZoomIn = () => cyRef.current?.zoom(cyRef.current.zoom() * 1.25);
  const handleZoomOut = () => cyRef.current?.zoom(cyRef.current.zoom() * 0.8);
  const handleFit = () => cyRef.current?.fit(undefined, 30);

  const handleExportPNG = () => {
    if (!cyRef.current) return;
    const png = cyRef.current.png({ full: true, scale: 2, bg: '#ffffff' });
    const a = document.createElement('a');
    a.href = png;
    a.download = `red_semantica_${currentStimulus?.text || 'grafo'}.png`;
    a.click();
  };

  return (
    <AdminLayout activeProjectId={projectId}>
      <div className="space-y-6">
        {/* Top Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 rounded-md text-[11px] font-extrabold uppercase tracking-wider">
                Ciencia Cognitiva de Redes
              </span>
              <span className="text-xs text-slate-400 font-medium">
                (Steyvers & Tenenbaum, Siew et al., Christensen & Kenett)
              </span>
            </div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight mt-1">
              Visualización y Análisis de Grafos
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Stimulus Selector */}
            <div className="relative">
              <select
                value={selectedStimulusId}
                onChange={e => setSelectedStimulusId(e.target.value)}
                className="bg-white text-slate-900 text-xs font-bold rounded-xl px-4 py-2.5 pr-8 border border-slate-200 shadow-xs focus:ring-2 focus:ring-primary-500 outline-none appearance-none cursor-pointer"
              >
                {stimuli.map(s => (
                  <option key={s.id} value={s.id}>
                    Estímulo: {s.text}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-3 pointer-events-none" />
            </div>

            {/* Model Toggle: Co-occurrence vs Star */}
            <div className="flex rounded-xl bg-slate-200/80 p-0.5 text-xs font-bold">
              <button
                type="button"
                onClick={() => setNetworkModel('cooccurrence')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  networkModel === 'cooccurrence'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Red de Coocurrencias
              </button>
              <button
                type="button"
                onClick={() => setNetworkModel('stimulus_star')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  networkModel === 'stimulus_star'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Red Estímulo-Definidoras
              </button>
            </div>
          </div>
        </div>

        {/* Network Metrics Strip (Only relevant for cooccurrence model) */}
        {networkModel === 'cooccurrence' && modernAnalysis && (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nodos (V)</span>
              <p className="text-xl font-black text-slate-900">{modernAnalysis.nodeCount}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Aristas (E)</span>
              <p className="text-xl font-black text-slate-900">{modernAnalysis.edgeCount}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Densidad (D)</span>
              <p className="text-xl font-black text-slate-900">{modernAnalysis.density}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Grado Medio</span>
              <p className="text-xl font-black text-slate-900">{modernAnalysis.averageDegree}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">ASPL (L)</span>
              <p className="text-xl font-black text-primary-600">{modernAnalysis.averageShortestPathLength}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Clustering (CC)</span>
              <p className="text-xl font-black text-indigo-600">{modernAnalysis.clusteringCoefficient}</p>
            </div>
            <div className="bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Modularidad (Q)</span>
              <p className="text-xl font-black text-emerald-600">{modernAnalysis.modularityQ}</p>
            </div>
          </div>
        )}

        {/* Cytoscape Interactive Canvas & Side Inspector */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden relative">
          {/* Canvas Controls Bar */}
          <div className="p-3 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3 bg-slate-50/50">
            {/* Search within graph */}
            <div className="relative max-w-xs w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                placeholder="Buscar palabra en la red..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {/* Sizing & Threshold Controls */}
            <div className="flex flex-wrap items-center gap-3 text-xs font-semibold text-slate-600">
              {networkModel === 'cooccurrence' && (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Tamaño:</span>
                    <select
                      value={nodeSizingMetric}
                      onChange={e => setNodeSizingMetric(e.target.value as any)}
                      className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs"
                    >
                      <option value="frequency">Frecuencia</option>
                      <option value="degree">Grado Nodal</option>
                      <option value="betweenness">Intermediación</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">Umbral Aristas:</span>
                    <input
                      type="range"
                      min={1}
                      max={5}
                      value={edgeThreshold}
                      onChange={e => setEdgeThreshold(Number(e.target.value))}
                      className="w-16 accent-primary-600"
                    />
                    <span className="font-mono font-bold text-slate-800">≥{edgeThreshold}</span>
                  </div>
                </>
              )}

              {/* View Control Buttons */}
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2">
                <button
                  type="button"
                  onClick={handleZoomIn}
                  className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700"
                  title="Acercar"
                >
                  <ZoomIn className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleZoomOut}
                  className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700"
                  title="Alejar"
                >
                  <ZoomOut className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleFit}
                  className="p-1.5 bg-white hover:bg-slate-100 border border-slate-200 rounded-lg text-slate-700"
                  title="Ajustar vista"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleExportPNG}
                  className="p-1.5 bg-primary-50 text-primary-700 hover:bg-primary-100 border border-primary-200 rounded-lg text-xs font-bold flex items-center gap-1 ml-1"
                  title="Exportar imagen en alta resolución"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>PNG</span>
                </button>
              </div>
            </div>
          </div>

          {/* Canvas Element */}
          <div className="relative">
            <div ref={containerRef} className="w-full h-[600px] bg-slate-50/40 cursor-grab active:cursor-grabbing" />

            {/* Node Inspector Drawer */}
            {selectedNode && (
              <div className="absolute top-4 right-4 z-20 w-72 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200 p-4 shadow-lg space-y-3 text-xs animate-in fade-in duration-150">
                <div className="flex items-start justify-between border-b border-slate-100 pb-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Nodo Seleccionado</span>
                    <h3 className="text-base font-extrabold text-slate-900">{selectedNode.label}</h3>
                  </div>
                  <button
                    onClick={() => setSelectedNode(null)}
                    className="text-slate-400 hover:text-slate-600 p-1"
                  >
                    ✕
                  </button>
                </div>

                <div className="space-y-1.5 font-medium text-slate-600">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span>Frecuencia absoluta:</span>
                    <span className="font-mono font-bold text-slate-900">{selectedNode.frequency}</span>
                  </div>

                  {selectedNode.valorM !== undefined && (
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span>Peso Semántico (M):</span>
                      <span className="font-mono font-bold text-primary-600">{selectedNode.valorM}</span>
                    </div>
                  )}

                  {selectedNode.valorFMG !== undefined && (
                    <div className="flex justify-between py-1 border-b border-slate-50">
                      <span>Distancia FMG:</span>
                      <span className="font-mono font-bold text-slate-900">{selectedNode.valorFMG}%</span>
                    </div>
                  )}

                  {networkModel === 'cooccurrence' && (
                    <>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span>Grado Nodal (k):</span>
                        <span className="font-mono font-bold text-slate-900">{selectedNode.degree}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span>Fuerza Ponderada (s):</span>
                        <span className="font-mono font-bold text-slate-900">{selectedNode.weightedDegree}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span>Centralidad Intermediación:</span>
                        <span className="font-mono font-bold text-slate-900">{selectedNode.betweennessCentrality}</span>
                      </div>
                      <div className="flex justify-between py-1 border-b border-slate-50">
                        <span>Centralidad Cercanía:</span>
                        <span className="font-mono font-bold text-slate-900">{selectedNode.closenessCentrality}</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>Comunidad Louvain:</span>
                        <span
                          className="px-2 py-0.5 rounded font-bold text-white text-[10px]"
                          style={{
                            backgroundColor:
                              COMMUNITY_COLORS[selectedNode.communityId % COMMUNITY_COLORS.length],
                          }}
                        >
                          Clúster {selectedNode.communityId + 1}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};
