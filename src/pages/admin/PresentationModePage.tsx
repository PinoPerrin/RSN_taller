import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { Project, Stimulus, StimulusResponse, NormalizationRule } from '../../types';
import { storageAdapter } from '../../services/storage/storageAdapter';
import { calculateTraditionalRSN } from '../../services/math/rsnTraditional';
import cytoscape from 'cytoscape';
// @ts-ignore
import cola from 'cytoscape-cola';
import { QRCodeSVG } from 'qrcode.react';
import {
  Maximize2,
  Minimize2,
  QrCode,
  Users,
  Sparkles,
  ChevronDown,
  Layers,
  X,
} from 'lucide-react';

try {
  cytoscape.use(cola);
} catch {
  // cola registered
}

export const PresentationModePage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();

  const [project, setProject] = useState<Project | null>(null);
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);
  const [selectedStimulusId, setSelectedStimulusId] = useState<string>('');
  const [responses, setResponses] = useState<StimulusResponse[]>([]);
  const [rules, setRules] = useState<NormalizationRule[]>([]);

  const [showQR, setShowQR] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const cyRef = useRef<cytoscape.Core | null>(null);

  useEffect(() => {
    if (!projectId) return;

    storageAdapter.getProject(projectId).then(setProject);
    const unsubStim = storageAdapter.subscribeStimuli(projectId, list => {
      setStimuli(list);
      if (list.length > 0 && !selectedStimulusId) setSelectedStimulusId(list[0].id);
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

  const currentStimulus = stimuli.find(s => s.id === selectedStimulusId);

  const analysis = useMemo(() => {
    if (responses.length === 0) return null;
    return calculateTraditionalRSN(responses, rules, true);
  }, [responses, rules]);

  // Cytoscape presentation graph
  useEffect(() => {
    if (!containerRef.current || !analysis || !currentStimulus) return;

    if (cyRef.current) {
      cyRef.current.destroy();
    }

    const elements: cytoscape.ElementDefinition[] = [];

    // Center Stimulus Node
    elements.push({
      data: {
        id: 'center_stimulus',
        label: currentStimulus.text,
        size: 70,
        color: '#0f172a',
        textColor: '#ffffff',
      },
    });

    // Top 15 definidoras
    analysis.definidoras.slice(0, 15).forEach((d, idx) => {
      const isNucleo = d.isNucleo;
      const isSAM = d.isSAM;
      const color = isNucleo ? '#10b981' : isSAM ? '#3b82f6' : '#94a3b8';
      const size = Math.max(30, Math.min(60, 24 + d.valorFMG * 0.35));

      elements.push({
        data: {
          id: d.word,
          label: d.word,
          size,
          color,
          textColor: '#0f172a',
          rank: idx + 1,
          fmg: d.valorFMG,
          m: d.valorM,
        },
      });

      elements.push({
        data: {
          id: `edge_${d.word}`,
          source: 'center_stimulus',
          target: d.word,
          width: Math.max(1.5, Math.min(7, (d.valorFMG / 100) * 7)),
          color: isNucleo ? '#10b981' : '#cbd5e1',
        },
      });
    });

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
            color: 'data(textColor)',
            'font-family': 'Inter, sans-serif',
            'font-size': '13px',
            'font-weight': 'bold',
            'text-valign': 'center',
            'text-halign': 'center',
            'text-outline-width': 2,
            'text-outline-color': '#ffffff',
            'border-width': 3,
            'border-color': '#ffffff',
          },
        },
        {
          selector: 'node[id = "center_stimulus"]',
          style: {
            shape: 'diamond',
            'font-size': '16px',
            'text-outline-color': '#0f172a',
          },
        },
        {
          selector: 'edge',
          style: {
            width: 'data(width)',
            'line-color': 'data(color)',
            'curve-style': 'bezier',
            opacity: 0.7,
          },
        },
      ],
      layout: {
        name: 'cola',
        // @ts-ignore
        animate: true,
        refresh: 1,
        maxSimulationTime: 2000,
        nodeSpacing: 50,
      },
    });

    cyRef.current = cy;
  }, [analysis, currentStimulus]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const publicUrl = project ? `${window.location.origin}/p/${project.publicId || project.id}` : '';

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col justify-between p-6 sm:p-8 select-none relative overflow-hidden">
      {/* Background radial gradient */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-primary-600/10 blur-[140px] pointer-events-none rounded-full" />

      {/* Top Bar for Projector */}
      <header className="relative z-10 flex items-center justify-between">
        <div>
          <span className="text-[11px] font-extrabold uppercase tracking-widest text-primary-400">
            {project?.institution || 'Taller de Investigación Científica'}
          </span>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight">{project?.title}</h1>
        </div>

        {/* Presentation Controls */}
        <div className="flex items-center gap-3">
          {/* Stimulus Selector */}
          <div className="relative">
            <select
              value={selectedStimulusId}
              onChange={e => setSelectedStimulusId(e.target.value)}
              className="bg-slate-900 text-white text-sm font-bold rounded-2xl px-4 py-2.5 pr-9 border border-slate-800 shadow-lg outline-none appearance-none cursor-pointer"
            >
              {stimuli.map(s => (
                <option key={s.id} value={s.id}>
                  Concepto: {s.text}
                </option>
              ))}
            </select>
            <ChevronDown className="w-4 h-4 text-slate-400 absolute right-3 top-3.5 pointer-events-none" />
          </div>

          {/* Toggle QR code */}
          <button
            onClick={() => setShowQR(!showQR)}
            className={`p-2.5 rounded-2xl border transition-all ${
              showQR
                ? 'bg-primary-600 border-primary-500 text-white shadow-lg shadow-primary-600/30'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
            title="Mostrar / Ocultar Código QR para participantes"
          >
            <QrCode className="w-5 h-5" />
          </button>

          {/* Fullscreen Button */}
          <button
            onClick={toggleFullscreen}
            className="p-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-2xl text-slate-300 hover:text-white transition-colors"
            title="Pantalla Completa"
          >
            {isFullscreen ? <Minimize2 className="w-5 h-5" /> : <Maximize2 className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Middle Interactive Canvas Area */}
      <main className="relative z-10 flex-1 my-6 flex flex-col justify-center items-center">
        {/* Prominent Stimulus Badge */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-20 text-center">
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Estímulo Central
          </span>
          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white drop-shadow-md">
            {currentStimulus?.text}
          </h2>
        </div>

        {/* Cytoscape Canvas */}
        <div ref={containerRef} className="w-full h-[65vh] rounded-3xl" />

        {/* Floating QR Code Modal (for audience to scan while looking at screen) */}
        {showQR && (
          <div className="absolute bottom-4 right-4 z-30 bg-white text-slate-900 p-5 rounded-3xl shadow-2xl border border-slate-200 text-center space-y-2 animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowQR(false)}
              className="absolute top-3 right-3 text-slate-400 hover:text-slate-700"
            >
              <X className="w-4 h-4" />
            </button>
            <QRCodeSVG value={publicUrl} size={150} level="H" includeMargin />
            <p className="text-xs font-black tracking-tight">¡Escanea para Participar!</p>
            <p className="text-[10px] font-mono text-slate-400 truncate max-w-[150px]">{publicUrl}</p>
          </div>
        )}
      </main>

      {/* Bottom Metrics Bar */}
      <footer className="relative z-10 grid grid-cols-2 sm:grid-cols-4 gap-4 bg-slate-900/80 backdrop-blur-md p-4 rounded-3xl border border-slate-800/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center font-bold">
            <Users className="w-5 h-5 text-primary-400" />
          </div>
          <div>
            <p className="text-xl font-black">{responses.length}</p>
            <p className="text-[11px] text-slate-400 font-medium">Participantes</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center font-bold">
            <span className="text-sm font-black text-emerald-400">J</span>
          </div>
          <div>
            <p className="text-xl font-black">{analysis?.valorJ || 0}</p>
            <p className="text-[11px] text-slate-400 font-medium">Tamaño de Red (J)</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center font-bold">
            <span className="text-sm font-black text-indigo-400">M</span>
          </div>
          <div>
            <p className="text-xl font-black">{analysis?.maxM || 0}</p>
            <p className="text-[11px] text-slate-400 font-medium">Peso Semántico Máx.</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-800 text-slate-200 flex items-center justify-center font-bold">
            <span className="text-sm font-black text-amber-400">NR</span>
          </div>
          <div>
            <p className="text-xl font-black">{analysis?.nucleoSet.length || 0}</p>
            <p className="text-[11px] text-slate-400 font-medium">Núcleo (Scree Test)</p>
          </div>
        </div>
      </footer>
    </div>
  );
};
