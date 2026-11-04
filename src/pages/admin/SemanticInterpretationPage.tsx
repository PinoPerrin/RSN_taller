import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  Project,
  Stimulus,
  StimulusResponse,
  NormalizationRule,
  ParticipantSession,
  SemanticInterpretationData,
} from '../../types';
import { storageAdapter } from '../../services/storage/storageAdapter';
import {
  generateSemanticInterpretation,
  computeDataFingerprint,
} from '../../services/ai/semanticInterpretationService';
import { AdminLayout } from '../../components/layout/AdminLayout';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  Sparkles,
  Brain,
  FileText,
  Download,
  Copy,
  Edit3,
  Save,
  Check,
  AlertTriangle,
  Info,
  Layers,
  Table,
  Network,
  GitCompare,
  RefreshCw,
  Sliders,
  Key,
  HelpCircle,
  CheckCircle2,
  ExternalLink,
  Eye,
  X,
  Compass,
  ArrowRight,
} from 'lucide-react';

export const SemanticInterpretationPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const currentProjectId = projectId || '';

  const [project, setProject] = useState<Project | null>(null);
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);
  const [sessions, setSessions] = useState<ParticipantSession[]>([]);
  const [responses, setResponses] = useState<StimulusResponse[]>([]);
  const [rules, setRules] = useState<NormalizationRule[]>([]);
  const [savedInterpretation, setSavedInterpretation] = useState<SemanticInterpretationData | null>(null);

  // Active View Tab: stimulus1 | stimulus2 | comparative
  const [activeTab, setActiveTab] = useState<'stimulus1' | 'stimulus2' | 'comparative'>('comparative');

  // Working interpretation (can be edited by user)
  const [currentInterpretation, setCurrentInterpretation] = useState<SemanticInterpretationData | null>(null);

  // UI state
  const [isGenerating, setIsGenerating] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);
  const [inspectedWord, setInspectedWord] = useState<string | null>(null);
  const [showAiConfigModal, setShowAiConfigModal] = useState(false);

  // AI Configuration state
  const [geminiApiKey, setGeminiApiKey] = useState(() => {
    return localStorage.getItem('rsn_gemini_api_key') || '';
  });
  const [preferredModel, setPreferredModel] = useState<'gemini-1.5-flash' | 'gemini-2.0-flash'>('gemini-1.5-flash');

  // Subscriptions
  useEffect(() => {
    if (!currentProjectId) return;

    storageAdapter.getProject(currentProjectId).then(setProject);
    const unsubStim = storageAdapter.subscribeStimuli(currentProjectId, setStimuli);
    const unsubSess = storageAdapter.subscribeSessions(currentProjectId, setSessions);
    const unsubResp = storageAdapter.subscribeResponses(currentProjectId, undefined, setResponses);
    const unsubRules = storageAdapter.subscribeRules(currentProjectId, setRules);
    const unsubInterp = storageAdapter.subscribeInterpretation(currentProjectId, data => {
      setSavedInterpretation(data);
      if (data && !currentInterpretation) {
        setCurrentInterpretation(data);
      }
    });

    return () => {
      unsubStim();
      unsubSess();
      unsubResp();
      unsubRules();
      unsubInterp();
    };
  }, [currentProjectId]);

  // Filter active completed responses from non-excluded participants
  const activeResponses = useMemo(() => {
    const activeSessionIds = new Set(
      sessions.filter(s => s.status === 'completed' && !s.flags?.excludedByAdmin).map(s => s.id)
    );
    return responses.filter(r => activeSessionIds.has(r.sessionId));
  }, [responses, sessions]);

  // Current dataset fingerprint
  const currentFingerprint = useMemo(() => {
    return computeDataFingerprint(activeResponses);
  }, [activeResponses]);

  // Check if saved interpretation is outdated compared to current responses
  const isOutdated = useMemo(() => {
    if (!currentInterpretation) return false;
    return currentInterpretation.dataVersionFingerprint !== currentFingerprint;
  }, [currentInterpretation, currentFingerprint]);

  const stim1 = stimuli[0];
  const stim2 = stimuli.length > 1 ? stimuli[1] : stimuli[0];
  const stim1Name = stim1?.text.toUpperCase() || 'ESTÍMULO 1';
  const stim2Name = stim2?.text.toUpperCase() || 'ESTÍMULO 2';

  // Generate or Regenerate Interpretation on Demand
  const handleGenerate = async (forceModel?: string) => {
    if (stimuli.length === 0 || activeResponses.length === 0) {
      alert('Se requieren al menos un estímulo y respuestas válidas para generar la interpretación.');
      return;
    }

    setIsGenerating(true);
    try {
      const applyCorrections = project?.settings?.includeCorrectionsInAnalysis !== false;
      const result = await generateSemanticInterpretation({
        projectId: currentProjectId,
        stimuli,
        responses: activeResponses,
        rules,
        applyCorrections,
        geminiApiKey: geminiApiKey.trim() || undefined,
        preferredModel: forceModel || preferredModel,
      });

      setCurrentInterpretation(result);
      await storageAdapter.saveInterpretation(currentProjectId, result);
    } catch (err: any) {
      console.error('Error generating interpretation:', err);
      alert('Error al generar interpretación: ' + (err.message || 'Error desconocido'));
    } finally {
      setIsGenerating(false);
    }
  };

  // Save manual edits
  const handleSaveEdits = async () => {
    if (!currentInterpretation) return;
    setIsSaving(true);
    try {
      const updated: SemanticInterpretationData = {
        ...currentInterpretation,
        status: 'edited_by_admin',
        updatedAt: new Date().toISOString(),
      };
      await storageAdapter.saveInterpretation(currentProjectId, updated);
      setCurrentInterpretation(updated);
      setIsEditing(false);
    } catch (err) {
      console.error('Error saving edits:', err);
      alert('No se pudieron guardar los cambios editados.');
    } finally {
      setIsSaving(false);
    }
  };

  // Save API key
  const handleSaveApiKey = (key: string) => {
    setGeminiApiKey(key);
    localStorage.setItem('rsn_gemini_api_key', key.trim());
    setShowAiConfigModal(false);
  };

  // Copy Markdown to Clipboard
  const handleCopyMarkdown = () => {
    if (!currentInterpretation) return;
    const r1 = currentInterpretation.stimulusReport1;
    const r2 = currentInterpretation.stimulusReport2;
    const comp = currentInterpretation.comparativeReport;

    const md = `# INFORME DE INTERPRETACIÓN SEMÁNTICA (RSN)
**Proyecto:** ${project?.title || currentProjectId}
**Fecha:** ${new Date(currentInterpretation.createdAt).toLocaleString()}
**Modelo Utilizado:** ${currentInterpretation.modelVersion}

---

## 1. Interpretación del Estímulo: ${stim1Name}
### A. Caracterización General
${r1.generalCharacterization}

### B. Núcleos Semánticos y Campos de Significado
${r1.semanticCores.text}

**Campos Semánticos Propuestos:**
${r1.semanticCores.proposedSemanticFields.map(f => `- **${f.fieldName}:** ${f.words.join(', ')} (${f.description})`).join('\n')}

### C. Connotación Semántica Predominante
${r1.connotation.text}
> *${r1.connotation.psychometricDisclaimer}*

### D. Relaciones Estructurales Pathfinder
${r1.pathfinderAnalysis.text}
> *${r1.pathfinderAnalysis.structuralDisclaimer}*

### E. Síntesis Interpretativa
${r1.synthesis}

---

## 2. Interpretación del Estímulo: ${stim2Name}
### A. Caracterización General
${r2.generalCharacterization}

### B. Núcleos Semánticos y Campos de Significado
${r2.semanticCores.text}

**Campos Semánticos Propuestos:**
${r2.semanticCores.proposedSemanticFields.map(f => `- **${f.fieldName}:** ${f.words.join(', ')} (${f.description})`).join('\n')}

### C. Connotación Semántica Predominante
${r2.connotation.text}
> *${r2.connotation.psychometricDisclaimer}*

### D. Relaciones Estructurales Pathfinder
${r2.pathfinderAnalysis.text}
> *${r2.pathfinderAnalysis.structuralDisclaimer}*

### E. Síntesis Interpretativa
${r2.synthesis}

---

## 3. Análisis Comparativo: ${stim1Name} vs ${stim2Name}
### A. Comparación Cuantitativa
- Participantes: ${comp.quantitativeTable.participants1} vs ${comp.quantitativeTable.participants2}
- Riqueza Léxica (Valor J): ${comp.quantitativeTable.valorJ1} vs ${comp.quantitativeTable.valorJ2}
- Peso M Máximo: ${comp.quantitativeTable.maxM1} vs ${comp.quantitativeTable.maxM2}
- Palabras Compartidas: ${comp.quantitativeTable.sharedCount} (${comp.quantitativeTable.sharedPercentage1}% de ${stim1Name}, ${comp.quantitativeTable.sharedPercentage2}% de ${stim2Name})
- Índice de Consenso Léxico (Jaccard): ${comp.quantitativeTable.jaccardIndex}%
- Correlación de Perfiles M (Pearson r): ${comp.quantitativeTable.pearsonCorrelation}
- Densidad Pathfinder: ${(comp.quantitativeTable.pathfinderDensity1 * 100).toFixed(1)}% vs ${(comp.quantitativeTable.pathfinderDensity2 * 100).toFixed(1)}% (Conjunta: ${(comp.quantitativeTable.pathfinderJointDensity * 100).toFixed(1)}%)

### B. Análisis de Palabras Compartidas
${comp.sharedWordsAnalysis.text}

### C. Diferencias en Campos Semánticos
${comp.semanticFieldsDifferences.text}

### D. Comparación Estructural de Pathfinder
${comp.pathfinderStructuralComparison.text}

### E. Síntesis Comparativa
${comp.comparativeSynthesis}

### F. Limitaciones de la Interpretación
${comp.limitations.map(l => `- ${l}`).join('\n')}
`;

    navigator.clipboard.writeText(md).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2500);
    });
  };

  // Export Academic PDF Report
  const handleExportPdf = () => {
    if (!currentInterpretation) return;
    const doc = new jsPDF({ unit: 'pt', format: 'letter' });
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 40;

    // Header banner
    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pageWidth, 55, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(255, 255, 255);
    doc.text('INFORME ACADÉMICO: INTERPRETACIÓN SEMÁNTICA (RSN)', 40, 34);

    y = 80;
    doc.setTextColor(51, 65, 85);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`Proyecto: ${project?.title || currentProjectId}  •  Generado: ${new Date().toLocaleDateString('es-MX')}  •  Modelo: ${currentInterpretation.modelVersion}`, 40, y);

    y += 25;
    // Section Title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text(`1. TABLA COMPARATIVA: ${stim1Name} VS ${stim2Name}`, 40, y);

    y += 10;
    const q = currentInterpretation.comparativeReport.quantitativeTable;
    (doc as any).autoTable({
      startY: y,
      head: [['Indicador Psicométrico', stim1Name, stim2Name, 'Relación Comparativa']],
      body: [
        ['Participantes Evaluados (N)', q.participants1, q.participants2, q.participants1 === q.participants2 ? 'Muestras simétricas' : 'Muestras diferenciadas'],
        ['Riqueza Semántica (Valor J)', q.valorJ1, q.valorJ2, `Diferencia de ${Math.abs(q.valorJ1 - q.valorJ2)} palabras`],
        ['Peso Semántico Máximo (M máx)', q.maxM1, q.maxM2, `Ratio: ${(Math.max(q.maxM1, q.maxM2) / Math.max(1, Math.min(q.maxM1, q.maxM2))).toFixed(2)}x`],
        ['Distancia Media en SAM (Valor G)', q.valorG1, q.valorG2, 'Gradiente decreciente de M'],
        ['Palabras Compartidas', `${q.sharedCount} (${q.sharedPercentage1}%)`, `${q.sharedCount} (${q.sharedPercentage2}%)`, `Jaccard: ${q.jaccardIndex}%`],
        ['Palabras Exclusivas', q.exclusive1Count, q.exclusive2Count, 'Especificidad léxica'],
        ['Correlación de Pesos M (Pearson r)', `${q.pearsonCorrelation}`, `${q.pearsonCorrelation}`, q.pearsonCorrelation > 0.5 ? 'Asociación moderada/alta' : 'Asociación baja/específica'],
        ['Densidad Pathfinder (PFNET r=∞)', `${(q.pathfinderDensity1 * 100).toFixed(1)}%`, `${(q.pathfinderDensity2 * 100).toFixed(1)}%`, `Conjunta: ${(q.pathfinderJointDensity * 100).toFixed(1)}%`],
      ],
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [30, 41, 59], textColor: [255, 255, 255] },
      theme: 'grid',
    });

    y = (doc as any).lastAutoTable.finalY + 25;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('2. SÍNTESIS COMPARATIVA', 40, y);

    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const splitSynth = doc.splitTextToSize(currentInterpretation.comparativeReport.comparativeSynthesis, pageWidth - 80);
    doc.text(splitSynth, 40, y);

    y += splitSynth.length * 12 + 20;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text('3. LIMITACIONES METODOLÓGICAS', 40, y);

    y += 15;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    currentInterpretation.comparativeReport.limitations.forEach(lim => {
      const splitLim = doc.splitTextToSize(`• ${lim}`, pageWidth - 80);
      doc.text(splitLim, 40, y);
      y += splitLim.length * 11 + 4;
    });

    doc.save(`Informe_Interpretacion_RSN_${stim1Name}_${stim2Name}.pdf`);
  };

  // Look up empirical stats for a clicked word
  const inspectedWordStats = useMemo(() => {
    if (!inspectedWord || !currentInterpretation) return null;
    const clean = inspectedWord.toLowerCase().trim();

    const r1 = currentInterpretation.stimulusReport1;
    const r2 = currentInterpretation.stimulusReport2;

    const findInReport = (r: typeof r1) => {
      const all = [...r.semanticCores.centralWords, ...r.semanticCores.secondaryWords, ...r.semanticCores.peripheralWords];
      return all.find(w => w.word.toLowerCase().trim() === clean);
    };

    const in1 = findInReport(r1);
    const in2 = findInReport(r2);

    const degJoint = currentInterpretation.comparativeReport.sharedWordsAnalysis.pathfinderRoles.find(
      r => r.word.toLowerCase().trim() === clean
    )?.degreeJoint || 0;

    let membership: 'stimulus1' | 'stimulus2' | 'shared' = 'stimulus1';
    if (in1 && in2) membership = 'shared';
    else if (in2) membership = 'stimulus2';

    return {
      word: inspectedWord,
      membership,
      in1,
      in2,
      degJoint,
    };
  }, [inspectedWord, currentInterpretation]);

  const report1 = currentInterpretation?.stimulusReport1;
  const report2 = currentInterpretation?.stimulusReport2;
  const compReport = currentInterpretation?.comparativeReport;

  return (
    <AdminLayout activeProjectId={currentProjectId}>
      <div className="space-y-6">
        {/* Top Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-purple-100 text-purple-900 text-[10px] font-black uppercase tracking-wider">
                Módulo Asistido por IA • RSN v3.2
              </span>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                <Brain className="w-6 h-6 text-purple-600" />
                Interpretación Semántica y Comparativa
              </h1>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Análisis cualitativo y cuantitativo integrado, derivado de los pesos matemáticos, definidoras y la topología Pathfinder.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* AI Settings Button */}
            <button
              onClick={() => setShowAiConfigModal(true)}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors"
              title="Configuración de IA (Gemini API / Motor Local)"
            >
              <Key className="w-3.5 h-3.5 text-amber-500" />
              <span>Configuración IA</span>
            </button>

            {/* Copy Markdown */}
            <button
              onClick={handleCopyMarkdown}
              disabled={!currentInterpretation}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50"
              title="Copiar informe en formato Markdown"
            >
              {copySuccess ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
              <span>{copySuccess ? 'Copiado' : 'Copiar'}</span>
            </button>

            {/* Export PDF */}
            <button
              onClick={handleExportPdf}
              disabled={!currentInterpretation}
              className="px-3 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-colors disabled:opacity-50"
              title="Exportar informe académico en PDF"
            >
              <Download className="w-3.5 h-3.5 text-primary-600" />
              <span>PDF</span>
            </button>

            {/* Toggle Edit Mode */}
            {currentInterpretation && (
              <button
                onClick={() => {
                  if (isEditing) handleSaveEdits();
                  else setIsEditing(true);
                }}
                disabled={isSaving}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-2xs transition-all ${
                  isEditing
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-white hover:bg-slate-50 border border-slate-200 text-slate-700'
                }`}
              >
                {isEditing ? <Save className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5 text-slate-500" />}
                <span>{isEditing ? (isSaving ? 'Guardando...' : 'Guardar Edición') : 'Editar Texto'}</span>
              </button>
            )}

            {/* Main Generate / Regenerate Button */}
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating || stimuli.length === 0}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black flex items-center gap-2 shadow-xs transition-all disabled:opacity-50 group"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
              <span>{isGenerating ? 'Analizando Redes...' : currentInterpretation ? 'Regenerar con IA' : 'Generar Interpretación con IA'}</span>
            </button>
          </div>
        </div>

        {/* Rigor & Epistemological Disclaimer Banner */}
        <div className="bg-amber-50/90 border border-amber-200/80 rounded-2xl p-3.5 flex items-start gap-3 shadow-2xs text-xs text-amber-900">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold">Interpretación exploratoria asistida por IA (Requiere revisión del investigador):</span>
            <p className="text-amber-800 text-[11px] leading-relaxed">
              La IA interpreta cualitativamente los indicadores matemáticos calculados por la plataforma.
              Las agrupaciones temáticas y connotaciones son hipótesis exploratorias emergentes de las frecuencias y distancias observadas;
              no constituyen mediciones psicométricas directas de valencia afectiva ni diagnósticos psicológicos individuales.
            </p>
          </div>
        </div>

        {/* Outdated Data Warning Banner */}
        {isOutdated && (
          <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 flex items-center justify-between gap-3 text-xs text-blue-900">
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-600 shrink-0" />
              <span>
                <strong>Datos actualizados:</strong> Se han registrado nuevas respuestas de participantes desde que se generó este informe.
              </span>
            </div>
            <button
              onClick={() => handleGenerate()}
              disabled={isGenerating}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-xs"
            >
              Actualizar Informe
            </button>
          </div>
        )}

        {/* Tab Navigation (Stimulus 1, Stimulus 2, Comparative) */}
        <div className="flex items-center justify-between border-b border-slate-200 gap-2 overflow-x-auto pb-1">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('comparative')}
              className={`px-4 py-2.5 rounded-t-2xl font-black text-xs flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'comparative'
                  ? 'border-purple-600 text-purple-700 bg-purple-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <GitCompare className="w-4 h-4 text-purple-600" />
              <span>Análisis Comparativo ({stim1Name} vs {stim2Name})</span>
            </button>

            <button
              onClick={() => setActiveTab('stimulus1')}
              className={`px-4 py-2.5 rounded-t-2xl font-black text-xs flex items-center gap-2 border-b-2 transition-all ${
                activeTab === 'stimulus1'
                  ? 'border-blue-600 text-blue-700 bg-blue-50/50'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
              <span>Estímulo 1: {stim1Name}</span>
            </button>

            {stimuli.length > 1 && (
              <button
                onClick={() => setActiveTab('stimulus2')}
                className={`px-4 py-2.5 rounded-t-2xl font-black text-xs flex items-center gap-2 border-b-2 transition-all ${
                  activeTab === 'stimulus2'
                    ? 'border-orange-600 text-orange-700 bg-orange-50/50'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-orange-500" />
                <span>Estímulo 2: {stim2Name}</span>
              </button>
            )}
          </div>

          {currentInterpretation && (
            <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
              Modelo: {currentInterpretation.modelVersion}
            </div>
          )}
        </div>

        {/* Empty State when no interpretation is generated yet */}
        {!currentInterpretation && !isGenerating && (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-xs">
            <div className="w-16 h-16 rounded-2xl bg-purple-50 text-purple-600 mx-auto flex items-center justify-center">
              <Brain className="w-8 h-8" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="text-base font-black text-slate-800">No se ha generado la interpretación semántica</h3>
              <p className="text-xs text-slate-500">
                Presiona el botón para procesar los indicadores cuantitativos (J, M, FMG, SAM),
                la red Pathfinder y generar la síntesis cualitativa estructurada.
              </p>
            </div>
            <button
              onClick={() => handleGenerate()}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-black shadow-xs inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generar Informe Ahora</span>
            </button>
          </div>
        )}

        {/* Loading Spinner State */}
        {isGenerating && (
          <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-4 shadow-xs animate-pulse">
            <div className="w-16 h-16 rounded-2xl bg-purple-100 text-purple-600 mx-auto flex items-center justify-center animate-spin">
              <RefreshCw className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-slate-800">Analizando indicadores psicométricos y redes Pathfinder...</h3>
              <p className="text-xs text-slate-500">
                Generando núcleos semánticos, campos interpretativos y síntesis comparativa fundamentada.
              </p>
            </div>
          </div>
        )}

        {/* TAB 1: COMPARATIVE ANALYSIS */}
        {currentInterpretation && !isGenerating && activeTab === 'comparative' && compReport && (
          <div className="space-y-6">
            {/* A. Comparación Cuantitativa */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center">
                    A
                  </span>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Comparación Cuantitativa y Estructural
                  </h3>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Indicadores Empíricos RSN & Pathfinder
                </span>
              </div>

              {/* Comparative Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[10px] font-black">
                    <tr>
                      <th className="py-2.5 px-4">Indicador Psicométrico</th>
                      <th className="py-2.5 px-4 font-bold text-blue-900 bg-blue-50/40">{stim1Name}</th>
                      <th className="py-2.5 px-4 font-bold text-orange-950 bg-orange-50/40">{stim2Name}</th>
                      <th className="py-2.5 px-4">Relación Comparativa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-slate-700">
                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">Participantes Válidos (N)</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-800">{compReport.quantitativeTable.participants1}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-orange-800">{compReport.quantitativeTable.participants2}</td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {compReport.quantitativeTable.participants1 === compReport.quantitativeTable.participants2
                          ? 'Tamaños de muestra balanceados'
                          : `Diferencia de ${Math.abs(compReport.quantitativeTable.participants1 - compReport.quantitativeTable.participants2)} participantes`}
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">Riqueza Semántica (Valor J)</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-800">{compReport.quantitativeTable.valorJ1}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-orange-800">{compReport.quantitativeTable.valorJ2}</td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {compReport.quantitativeTable.valorJ1 > compReport.quantitativeTable.valorJ2
                          ? `Mayor diversidad léxica en ${stim1Name}`
                          : compReport.quantitativeTable.valorJ2 > compReport.quantitativeTable.valorJ1
                          ? `Mayor diversidad léxica en ${stim2Name}`
                          : 'Riqueza léxica idéntica'}
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">Peso Semántico Máximo (M máx)</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-800">{compReport.quantitativeTable.maxM1}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-orange-800">{compReport.quantitativeTable.maxM2}</td>
                      <td className="py-2.5 px-4 text-slate-500">
                        Ratio de intensidades: {(Math.max(compReport.quantitativeTable.maxM1, compReport.quantitativeTable.maxM2) / Math.max(1, Math.min(compReport.quantitativeTable.maxM1, compReport.quantitativeTable.maxM2))).toFixed(2)}x
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">Distancia Media en SAM (Valor G)</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-800">{compReport.quantitativeTable.valorG1}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-orange-800">{compReport.quantitativeTable.valorG2}</td>
                      <td className="py-2.5 px-4 text-slate-500">Pendiente de decremento de pesos M en el núcleo</td>
                    </tr>

                    <tr className="hover:bg-slate-50/50 bg-purple-50/30">
                      <td className="py-2.5 px-4 font-bold text-purple-900">Palabras Compartidas</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-purple-900">
                        {compReport.quantitativeTable.sharedCount} ({compReport.quantitativeTable.sharedPercentage1}%)
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-purple-900">
                        {compReport.quantitativeTable.sharedCount} ({compReport.quantitativeTable.sharedPercentage2}%)
                      </td>
                      <td className="py-2.5 px-4 font-bold text-purple-800">
                        Índice de Jaccard (ICG): {compReport.quantitativeTable.jaccardIndex}%
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">Palabras Exclusivas</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-800">{compReport.quantitativeTable.exclusive1Count}</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-orange-800">{compReport.quantitativeTable.exclusive2Count}</td>
                      <td className="py-2.5 px-4 text-slate-500">Vocabulario característico no compartido</td>
                    </tr>

                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">Correlación de Pearson (r de Pesos M)</td>
                      <td colSpan={2} className="py-2.5 px-4 text-center font-mono font-black text-slate-900">
                        r = {compReport.quantitativeTable.pearsonCorrelation}
                      </td>
                      <td className="py-2.5 px-4 text-slate-500">
                        {compReport.quantitativeTable.pearsonCorrelation > 0.6
                          ? 'Alta convergencia de importancia relativa'
                          : compReport.quantitativeTable.pearsonCorrelation > 0.3
                          ? 'Convergencia moderada / esquemas complementarios'
                          : 'Asociación débil / esquemas semánticos diferenciados'}
                      </td>
                    </tr>

                    <tr className="hover:bg-slate-50/50">
                      <td className="py-2.5 px-4 font-bold text-slate-900">Densidad Pathfinder (PFNET r=∞, q=n-1)</td>
                      <td className="py-2.5 px-4 font-mono font-bold text-blue-800">
                        {(compReport.quantitativeTable.pathfinderDensity1 * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 font-mono font-bold text-orange-800">
                        {(compReport.quantitativeTable.pathfinderDensity2 * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 text-slate-500 font-mono">
                        Red conjunta: {(compReport.quantitativeTable.pathfinderJointDensity * 100).toFixed(1)}%
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* B. Análisis de Palabras Compartidas y Bicolor */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center">
                    B
                  </span>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Análisis de Palabras Compartidas (Nodos Bicolor en Pathfinder)
                  </h3>
                </div>
                <Link
                  to={`/admin/projects/${currentProjectId}/pathfinder`}
                  className="text-xs font-bold text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <Compass className="w-3.5 h-3.5" />
                  <span>Ver en Grafo Pathfinder</span>
                </Link>
              </div>

              {/* Three partition groups */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* 1. Similar Importance */}
                <div className="p-3.5 rounded-2xl bg-purple-50/60 border border-purple-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-purple-900">Importancia Semejante</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-200 text-purple-900 font-bold font-mono text-[10px]">
                      {compReport.sharedWordsAnalysis.similarImportance.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-purple-800">
                    Palabras con pesos porcentuales equivalentes (|ΔFMG| ≤ 18%).
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {compReport.sharedWordsAnalysis.similarImportance.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">Ninguna</span>
                    ) : (
                      compReport.sharedWordsAnalysis.similarImportance.map(s => (
                        <button
                          key={s.word}
                          onClick={() => setInspectedWord(s.word)}
                          className="px-2 py-1 rounded-lg bg-white border border-purple-300 font-bold text-purple-950 hover:bg-purple-100 transition-colors shadow-2xs flex items-center gap-1"
                        >
                          <span className="w-2.5 h-2.5 rounded-full border border-purple-600 overflow-hidden flex">
                            <span className="w-1/2 h-full bg-[#bfdbfe]" />
                            <span className="w-1/2 h-full bg-[#fed7aa]" />
                          </span>
                          <span>{s.word}</span>
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* 2. Higher in Stimulus 1 */}
                <div className="p-3.5 rounded-2xl bg-blue-50/60 border border-blue-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-blue-900">Mayor en {stim1Name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-blue-200 text-blue-900 font-bold font-mono text-[10px]">
                      {compReport.sharedWordsAnalysis.higherInStimulus1.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-blue-800">
                    Conceptos compartidos con mayor relevancia semántica en {stim1Name}.
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {compReport.sharedWordsAnalysis.higherInStimulus1.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">Ninguna</span>
                    ) : (
                      compReport.sharedWordsAnalysis.higherInStimulus1.map(s => (
                        <button
                          key={s.word}
                          onClick={() => setInspectedWord(s.word)}
                          className="px-2 py-1 rounded-lg bg-white border border-blue-300 font-bold text-blue-950 hover:bg-blue-100 transition-colors shadow-2xs"
                        >
                          {s.word} ({s.fmg1}%)
                        </button>
                      ))
                    )}
                  </div>
                </div>

                {/* 3. Higher in Stimulus 2 */}
                <div className="p-3.5 rounded-2xl bg-orange-50/60 border border-orange-200/70 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-orange-950">Mayor en {stim2Name}</span>
                    <span className="px-1.5 py-0.5 rounded bg-orange-200 text-orange-950 font-bold font-mono text-[10px]">
                      {compReport.sharedWordsAnalysis.higherInStimulus2.length}
                    </span>
                  </div>
                  <p className="text-[11px] text-orange-900">
                    Conceptos compartidos con mayor relevancia semántica en {stim2Name}.
                  </p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {compReport.sharedWordsAnalysis.higherInStimulus2.length === 0 ? (
                      <span className="text-[11px] text-slate-400 italic">Ninguna</span>
                    ) : (
                      compReport.sharedWordsAnalysis.higherInStimulus2.map(s => (
                        <button
                          key={s.word}
                          onClick={() => setInspectedWord(s.word)}
                          className="px-2 py-1 rounded-lg bg-white border border-orange-300 font-bold text-orange-950 hover:bg-orange-100 transition-colors shadow-2xs"
                        >
                          {s.word} ({s.fmg2}%)
                        </button>
                      ))
                    )}
                  </div>
                </div>
              </div>

              {/* Text interpretation */}
              {isEditing ? (
                <textarea
                  rows={4}
                  value={compReport.sharedWordsAnalysis.text}
                  onChange={e => {
                    const text = e.target.value;
                    setCurrentInterpretation(prev =>
                      prev ? { ...prev, comparativeReport: { ...prev.comparativeReport, sharedWordsAnalysis: { ...prev.comparativeReport.sharedWordsAnalysis, text } } } : null
                    );
                  }}
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 font-sans"
                />
              ) : (
                <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-100 text-xs text-slate-700 leading-relaxed space-y-2">
                  <div className="flex items-center gap-1.5 text-purple-700 font-bold text-[11px]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Interpretación de la Cohesión Cruzada:</span>
                  </div>
                  <p>{compReport.sharedWordsAnalysis.text}</p>
                </div>
              )}
            </div>

            {/* C. Diferencias en Campos Semánticos */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center">
                    C
                  </span>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Diferencias en los Campos Semánticos y Connotación
                  </h3>
                </div>
              </div>

              {isEditing ? (
                <textarea
                  rows={4}
                  value={compReport.semanticFieldsDifferences.text}
                  onChange={e => {
                    const text = e.target.value;
                    setCurrentInterpretation(prev =>
                      prev ? { ...prev, comparativeReport: { ...prev.comparativeReport, semanticFieldsDifferences: { ...prev.comparativeReport.semanticFieldsDifferences, text } } } : null
                    );
                  }}
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 font-sans"
                />
              ) : (
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                  {compReport.semanticFieldsDifferences.text}
                </p>
              )}
            </div>

            {/* D. Comparación Estructural Pathfinder */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-lg bg-purple-100 text-purple-800 font-black text-xs flex items-center justify-center">
                    D
                  </span>
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Comparación Estructural de Pathfinder (Redes Independientes y Red Conjunta)
                  </h3>
                </div>
              </div>

              {isEditing ? (
                <textarea
                  rows={4}
                  value={compReport.pathfinderStructuralComparison.text}
                  onChange={e => {
                    const text = e.target.value;
                    setCurrentInterpretation(prev =>
                      prev ? { ...prev, comparativeReport: { ...prev.comparativeReport, pathfinderStructuralComparison: { ...prev.comparativeReport.pathfinderStructuralComparison, text } } } : null
                    );
                  }}
                  className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 font-sans"
                />
              ) : (
                <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                  {compReport.pathfinderStructuralComparison.text}
                </p>
              )}
            </div>

            {/* E. Síntesis Comparativa (150-250 palabras) */}
            <div className="bg-gradient-to-br from-purple-50/60 to-indigo-50/40 p-6 rounded-3xl border border-purple-200/80 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-purple-200/60">
                <span className="w-6 h-6 rounded-lg bg-purple-600 text-white font-black text-xs flex items-center justify-center">
                  E
                </span>
                <h3 className="text-base font-black text-purple-950 tracking-tight flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Síntesis Comparativa Integrada
                </h3>
              </div>

              {isEditing ? (
                <textarea
                  rows={6}
                  value={compReport.comparativeSynthesis}
                  onChange={e => {
                    const text = e.target.value;
                    setCurrentInterpretation(prev =>
                      prev ? { ...prev, comparativeReport: { ...prev.comparativeReport, comparativeSynthesis: text } } : null
                    );
                  }}
                  className="w-full p-3 text-xs rounded-xl border border-purple-300 focus:ring-2 focus:ring-purple-500 font-sans bg-white"
                />
              ) : (
                <p className="text-xs text-purple-950 font-medium leading-relaxed">
                  {compReport.comparativeSynthesis}
                </p>
              )}
            </div>

            {/* F. Limitaciones Metodológicas */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center gap-2 pb-2 border-b border-slate-100 text-slate-800">
                <span className="w-6 h-6 rounded-lg bg-slate-200 text-slate-700 font-black text-xs flex items-center justify-center">
                  F
                </span>
                <h4 className="text-sm font-black tracking-tight flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-500" />
                  Limitaciones Metodológicas del Análisis
                </h4>
              </div>
              <ul className="space-y-2 text-xs text-slate-600">
                {compReport.limitations.map((lim, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-slate-400 mt-1.5 shrink-0" />
                    <span>{lim}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* TAB 2 & 3: INDIVIDUAL STIMULUS REPORT (STIMULUS 1 OR STIMULUS 2) */}
        {currentInterpretation && !isGenerating && (activeTab === 'stimulus1' || activeTab === 'stimulus2') && (
          <div className="space-y-6">
            {(() => {
              const r = activeTab === 'stimulus1' ? report1! : report2!;
              const themeColor = activeTab === 'stimulus1' ? 'blue' : 'orange';

              return (
                <>
                  {/* A. Caracterización General */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg bg-${themeColor}-100 text-${themeColor}-800 font-black text-xs flex items-center justify-center`}>
                          A
                        </span>
                        <h3 className="text-base font-black text-slate-900 tracking-tight">
                          Caracterización General de la Red
                        </h3>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        {r.stimulusText.toUpperCase()}
                      </span>
                    </div>

                    {isEditing ? (
                      <textarea
                        rows={4}
                        value={r.generalCharacterization}
                        onChange={e => {
                          const text = e.target.value;
                          setCurrentInterpretation(prev => {
                            if (!prev) return null;
                            const key = activeTab === 'stimulus1' ? 'stimulusReport1' : 'stimulusReport2';
                            return { ...prev, [key]: { ...prev[key], generalCharacterization: text } };
                          });
                        }}
                        className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 font-sans"
                      />
                    ) : (
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                        {r.generalCharacterization}
                      </p>
                    )}

                    {/* Numeric Cards */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Participantes (N)</span>
                        <p className="text-xl font-black text-slate-900">{r.participantCount}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Riqueza Léxica (J)</span>
                        <p className="text-xl font-black text-slate-900">{r.valorJ}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400">M Máximo</span>
                        <p className="text-xl font-black text-slate-900">{r.maxM}</p>
                      </div>
                      <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200/60">
                        <span className="text-[10px] uppercase font-bold text-slate-400">Concentración en SAM</span>
                        <p className="text-xl font-black text-emerald-600">{r.concentrationRatio}%</p>
                      </div>
                    </div>
                  </div>

                  {/* B. Interpretación de los Núcleos Semánticos */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg bg-${themeColor}-100 text-${themeColor}-800 font-black text-xs flex items-center justify-center`}>
                          B
                        </span>
                        <h3 className="text-base font-black text-slate-900 tracking-tight">
                          Núcleos Semánticos y Campos de Significado Propuestos
                        </h3>
                      </div>
                    </div>

                    {/* Words distribution (Central, Secondary, Peripheral) */}
                    <div className="space-y-3">
                      <div>
                        <span className="text-xs font-bold text-slate-700 block mb-1.5">
                          Palabras Centrales (Núcleo Scree Test):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {r.semanticCores.centralWords.map(w => (
                            <button
                              key={w.word}
                              onClick={() => setInspectedWord(w.word)}
                              className="px-2.5 py-1 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
                              title="Haz clic para ver la ficha empírica completa"
                            >
                              <span>{w.word}</span>
                              <span className="text-[10px] font-mono text-amber-300 font-normal">M={w.valorM}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <span className="text-xs font-bold text-slate-700 block mb-1.5">
                          Palabras Secundarias (SAM Extendido):
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {r.semanticCores.secondaryWords.map(w => (
                            <button
                              key={w.word}
                              onClick={() => setInspectedWord(w.word)}
                              className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                              title="Haz clic para ver la ficha empírica completa"
                            >
                              <span>{w.word}</span>
                              <span className="text-[10px] font-mono text-slate-500">M={w.valorM}</span>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Proposed Semantic Fields */}
                      <div className="pt-2">
                        <span className="text-xs font-bold text-slate-700 block mb-2">
                          Agrupaciones Temáticas e Interpretativas:
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                          {r.semanticCores.proposedSemanticFields.map((field, idx) => (
                            <div key={idx} className="p-3 bg-purple-50/50 rounded-2xl border border-purple-100 space-y-1">
                              <span className="font-bold text-purple-950 block">{field.fieldName}</span>
                              <p className="text-[11px] text-purple-800 leading-tight">{field.description}</p>
                              <div className="flex flex-wrap gap-1 pt-1">
                                {field.words.map(w => (
                                  <span key={w} className="px-1.5 py-0.5 rounded bg-white text-purple-900 font-medium text-[10.5px] border border-purple-200">
                                    {w}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {isEditing ? (
                      <textarea
                        rows={4}
                        value={r.semanticCores.text}
                        onChange={e => {
                          const text = e.target.value;
                          setCurrentInterpretation(prev => {
                            if (!prev) return null;
                            const key = activeTab === 'stimulus1' ? 'stimulusReport1' : 'stimulusReport2';
                            return { ...prev, [key]: { ...prev[key], semanticCores: { ...prev[key].semanticCores, text } } };
                          });
                        }}
                        className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 font-sans"
                      />
                    ) : (
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                        {r.semanticCores.text}
                      </p>
                    )}
                  </div>

                  {/* C. Connotación Semántica Predominante */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg bg-${themeColor}-100 text-${themeColor}-800 font-black text-xs flex items-center justify-center`}>
                          C
                        </span>
                        <h3 className="text-base font-black text-slate-900 tracking-tight">
                          Connotación Semántica Predominante
                        </h3>
                      </div>
                    </div>

                    {isEditing ? (
                      <textarea
                        rows={4}
                        value={r.connotation.text}
                        onChange={e => {
                          const text = e.target.value;
                          setCurrentInterpretation(prev => {
                            if (!prev) return null;
                            const key = activeTab === 'stimulus1' ? 'stimulusReport1' : 'stimulusReport2';
                            return { ...prev, [key]: { ...prev[key], connotation: { ...prev[key].connotation, text } } };
                          });
                        }}
                        className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 font-sans"
                      />
                    ) : (
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                        {r.connotation.text}
                      </p>
                    )}

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 italic">
                      {r.connotation.psychometricDisclaimer}
                    </div>
                  </div>

                  {/* D. Interpretación de Relaciones Pathfinder */}
                  <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg bg-${themeColor}-100 text-${themeColor}-800 font-black text-xs flex items-center justify-center`}>
                          D
                        </span>
                        <h3 className="text-base font-black text-slate-900 tracking-tight">
                          Estructura y Relaciones Pathfinder (PFNET)
                        </h3>
                      </div>
                    </div>

                    {/* Metric Documentation Box */}
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                      <span className="font-bold text-slate-800 flex items-center gap-1.5">
                        <Compass className="w-4 h-4 text-primary-600" />
                        Fundamentación Métrica de Pathfinder:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-600">
                        <p><strong>Matriz de Proximidad:</strong> {r.pathfinderAnalysis.metricDocumentation.proximityMatrixDescription}</p>
                        <p><strong>Significado de W:</strong> {r.pathfinderAnalysis.metricDocumentation.wMeaning}</p>
                        <p><strong>Distancia vs Similitud:</strong> {r.pathfinderAnalysis.metricDocumentation.isDistanceOrSimilarity}</p>
                        <p><strong>Parámetros:</strong> {r.pathfinderAnalysis.metricDocumentation.rParam} • {r.pathfinderAnalysis.metricDocumentation.qParam}</p>
                      </div>
                    </div>

                    {isEditing ? (
                      <textarea
                        rows={4}
                        value={r.pathfinderAnalysis.text}
                        onChange={e => {
                          const text = e.target.value;
                          setCurrentInterpretation(prev => {
                            if (!prev) return null;
                            const key = activeTab === 'stimulus1' ? 'stimulusReport1' : 'stimulusReport2';
                            return { ...prev, [key]: { ...prev[key], pathfinderAnalysis: { ...prev[key].pathfinderAnalysis, text } } };
                          });
                        }}
                        className="w-full p-3 text-xs rounded-xl border border-slate-300 focus:ring-2 focus:ring-purple-500 font-sans"
                      />
                    ) : (
                      <p className="text-xs text-slate-700 leading-relaxed bg-slate-50/80 p-4 rounded-2xl border border-slate-100">
                        {r.pathfinderAnalysis.text}
                      </p>
                    )}

                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-[11px] text-slate-500 italic">
                      {r.pathfinderAnalysis.structuralDisclaimer}
                    </div>
                  </div>

                  {/* E. Síntesis Interpretativa (100-150 palabras) */}
                  <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white p-6 rounded-3xl shadow-xs space-y-3">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                      <span className="w-6 h-6 rounded-lg bg-primary-500 text-white font-black text-xs flex items-center justify-center">
                        E
                      </span>
                      <h3 className="text-base font-black tracking-tight flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        Síntesis Interpretativa ({r.stimulusText.toUpperCase()})
                      </h3>
                    </div>

                    {isEditing ? (
                      <textarea
                        rows={5}
                        value={r.synthesis}
                        onChange={e => {
                          const text = e.target.value;
                          setCurrentInterpretation(prev => {
                            if (!prev) return null;
                            const key = activeTab === 'stimulus1' ? 'stimulusReport1' : 'stimulusReport2';
                            return { ...prev, [key]: { ...prev[key], synthesis: text } };
                          });
                        }}
                        className="w-full p-3 text-xs rounded-xl border border-slate-600 focus:ring-2 focus:ring-primary-500 font-sans text-slate-900 bg-white"
                      />
                    ) : (
                      <p className="text-xs text-slate-200 font-medium leading-relaxed">
                        {r.synthesis}
                      </p>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        )}

        {/* Word Inspector Modal (Traceability feature) */}
        {inspectedWordStats && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight">
                    «{inspectedWordStats.word}»
                  </h3>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      inspectedWordStats.membership === 'shared'
                        ? 'bg-purple-100 text-purple-900'
                        : inspectedWordStats.membership === 'stimulus1'
                        ? 'bg-blue-100 text-blue-900'
                        : 'bg-orange-100 text-orange-950'
                    }`}
                  >
                    {inspectedWordStats.membership === 'shared'
                      ? 'Compartida (Bicolor)'
                      : inspectedWordStats.membership === 'stimulus1'
                      ? `Solo ${stim1Name}`
                      : `Solo ${stim2Name}`}
                  </span>
                </div>
                <button
                  onClick={() => setInspectedWord(null)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Data Breakdown in both stimuli */}
              <div className="grid grid-cols-2 gap-3 text-xs">
                {/* Stimulus 1 */}
                <div className="p-3 bg-blue-50/50 rounded-2xl border border-blue-100 space-y-1">
                  <span className="font-bold text-blue-950">{stim1Name}</span>
                  {inspectedWordStats.in1 ? (
                    <div className="space-y-0.5 text-[11px] text-blue-900">
                      <p>Frecuencia (FA): <strong>{inspectedWordStats.in1.frequency}</strong></p>
                      <p>Peso Semántico (M): <strong>{inspectedWordStats.in1.valorM}</strong></p>
                      <p>Valor FMG %: <strong>{inspectedWordStats.in1.valorFMG}%</strong></p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No evocada en este estímulo</p>
                  )}
                </div>

                {/* Stimulus 2 */}
                <div className="p-3 bg-orange-50/50 rounded-2xl border border-orange-100 space-y-1">
                  <span className="font-bold text-orange-950">{stim2Name}</span>
                  {inspectedWordStats.in2 ? (
                    <div className="space-y-0.5 text-[11px] text-orange-900">
                      <p>Frecuencia (FA): <strong>{inspectedWordStats.in2.frequency}</strong></p>
                      <p>Peso Semántico (M): <strong>{inspectedWordStats.in2.valorM}</strong></p>
                      <p>Valor FMG %: <strong>{inspectedWordStats.in2.valorFMG}%</strong></p>
                    </div>
                  ) : (
                    <p className="text-[11px] text-slate-400 italic">No evocada en este estímulo</p>
                  )}
                </div>
              </div>

              {/* Pathfinder role */}
              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-700 space-y-1">
                <span className="font-bold flex items-center gap-1.5 text-slate-900">
                  <Compass className="w-3.5 h-3.5 text-primary-600" />
                  Estructura en Red Pathfinder:
                </span>
                <p className="text-[11px] text-slate-600">
                  {inspectedWordStats.degJoint > 0
                    ? `Este concepto posee ${inspectedWordStats.degJoint} conexiones directas conservadas en la red podada conjunta.`
                    : 'Concepto periférico o podado por optimización de distancias mínimas (r=∞).'}
                </p>
              </div>

              {/* Links to Graph and Traditional */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <Link
                  to={`/admin/projects/${currentProjectId}/pathfinder`}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 font-bold text-xs inline-flex items-center gap-1"
                >
                  <Compass className="w-3.5 h-3.5 text-purple-600" />
                  <span>Ver en Pathfinder</span>
                </Link>
                <Link
                  to={`/admin/projects/${currentProjectId}/traditional`}
                  className="px-3 py-1.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold text-xs inline-flex items-center gap-1"
                >
                  <Network className="w-3.5 h-3.5" />
                  <span>Ver en Análisis RSN</span>
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* AI Configuration Modal (Gemini API & Firebase Architecture) */}
        {showAiConfigModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Key className="w-5 h-5 text-amber-500" />
                  <h3 className="text-base font-black text-slate-900 tracking-tight">
                    Configuración del Motor de Inteligencia Artificial
                  </h3>
                </div>
                <button
                  onClick={() => setShowAiConfigModal(false)}
                  className="p-1 rounded-lg text-slate-400 hover:bg-slate-100"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Security & Plan Explanation */}
              <div className="space-y-3 text-xs text-slate-600">
                <div className="p-3 bg-purple-50 rounded-2xl border border-purple-200 space-y-1 text-purple-950">
                  <span className="font-bold flex items-center gap-1.5">
                    <Brain className="w-3.5 h-3.5 text-purple-600" />
                    Arquitectura Gratuita Recomendada (Google AI Studio Spark):
                  </span>
                  <p className="text-[11px] text-purple-900 leading-relaxed">
                    Firebase AI Logic / Vertex AI en Firebase requiere vincular una cuenta de facturación Google Cloud con plan Blaze.
                    Para operar en el <strong>plan gratuito (Spark) sin costos ni tarjetas de crédito</strong>, puedes utilizar directamente
                    tu API Key gratuita de Google AI Studio (hasta 1,500 consultas diarias gratuitas).
                  </p>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block">
                    API Key de Google Gemini (Gratuita de Google AI Studio):
                  </label>
                  <input
                    type="password"
                    placeholder="AIzaSy..."
                    defaultValue={geminiApiKey}
                    id="gemini-key-input"
                    className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-[10px] text-slate-400 block">
                    La clave se guarda exclusivamente en el almacenamiento local de tu navegador de administrador. Los participantes del taller no tienen acceso a ella.
                  </span>
                </div>

                <div className="space-y-1.5">
                  <label className="font-bold text-slate-800 block">Modelo Preferido:</label>
                  <select
                    value={preferredModel}
                    onChange={e => setPreferredModel(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold text-slate-800"
                  >
                    <option value="gemini-1.5-flash">Gemini 1.5 Flash (Rápido, Gratuito, Optimizado para Análisis)</option>
                    <option value="gemini-2.0-flash">Gemini 2.0 Flash (Última generación multimodal y analítica)</option>
                  </select>
                </div>

                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-[11px] text-slate-500">
                  <strong>¿Qué sucede si no ingreso clave?</strong> La plataforma utiliza de forma automática su
                  <strong>Motor Heurístico Local Offline</strong>, generando la interpretación cualitativa y cuantitativa completa
                  con base en las fórmulas psicométricas de Valdez Medina, Reyes Lagunes y Schvaneveldt, sin requerir internet ni claves externas.
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowAiConfigModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    const el = document.getElementById('gemini-key-input') as HTMLInputElement;
                    handleSaveApiKey(el ? el.value : geminiApiKey);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-700 text-white shadow-xs"
                >
                  Guardar Configuración
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};
