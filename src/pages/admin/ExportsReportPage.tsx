import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Project, Stimulus, ParticipantSession, StimulusResponse, NormalizationRule } from '../../types';
import { storageAdapter, localDB } from '../../services/storage/storageAdapter';
import { calculateTraditionalRSN, normalizeWord } from '../../services/math/rsnTraditional';
import { buildBinaryResponseMatrix, buildCooccurrenceMatrix } from '../../services/math/graphAnalysis';
import { AdminLayout } from '../../components/layout/AdminLayout';
import { jsPDF } from 'jspdf';
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  Table,
  CheckCircle2,
  Sparkles,
  Layers,
  Database,
  Printer,
} from 'lucide-react';

export const ExportsReportPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const currentProjectId = projectId || '';

  const [project, setProject] = useState<Project | null>(null);
  const [stimuli, setStimuli] = useState<Stimulus[]>([]);
  const [sessions, setSessions] = useState<ParticipantSession[]>([]);
  const [responses, setResponses] = useState<StimulusResponse[]>([]);
  const [rules, setRules] = useState<NormalizationRule[]>([]);
  const [selectedStimulusId, setSelectedStimulusId] = useState<string>('');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  useEffect(() => {
    storageAdapter.getProject(currentProjectId).then(p => {
      if (p) setProject(p);
    });
    const unsubStim = storageAdapter.subscribeStimuli(currentProjectId, list => {
      setStimuli(list);
      if (list.length > 0 && !selectedStimulusId) {
        setSelectedStimulusId(list[0].id);
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

  const activeSessions = sessions.filter(s => s.status === 'completed' && !s.flags?.excludedByAdmin);
  const activeSessionIds = new Set(activeSessions.map(s => s.id));
  const activeResponses = responses.filter(r => activeSessionIds.has(r.sessionId));

  // 1. Export Raw Associations CSV
  const handleExportRawCsv = () => {
    const headers = [
      'session_id',
      'anonymous_id',
      'stimulus_id',
      'stimulus_text',
      'generation_order',
      'rank',
      'weight_vs',
      'raw_word',
      'normalized_word',
      'confirmed_ms',
      'participant_excluded',
      'completed_at',
    ];

    const rows: string[] = [headers.join(',')];

    responses.forEach(r => {
      const sess = sessions.find(s => s.id === r.sessionId);
      const isExcluded = sess?.flags?.excludedByAdmin ? 'YES' : 'NO';

      r.associations.forEach(a => {
        const norm = normalizeWord(a.rawWord, rules, true);
        const weight = 11 - a.rank; // canonical
        rows.push([
          `"${r.sessionId}"`,
          `"${sess?.anonymousId || ''}"`,
          `"${r.stimulusId}"`,
          `"${r.stimulusText}"`,
          a.generationOrder,
          a.rank,
          weight,
          `"${a.rawWord.replace(/"/g, '""')}"`,
          `"${norm.replace(/"/g, '""')}"`,
          a.timing?.confirmedMs || 0,
          `"${isExcluded}"`,
          `"${r.completedAt}"`,
        ].join(','));
      });
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `RSN_Raw_Associations_${currentProjectId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 2. Export Summary Definidoras CSV
  const handleExportDefinidorasCsv = () => {
    const applyCorrections = project?.settings?.includeCorrectionsInAnalysis !== false;
    const headers = [
      'stimulus_text',
      'word',
      'frequency_fa',
      'relative_frequency',
      'valor_m_ps',
      'valor_fmg_pct',
      'mean_rank',
      'in_sam_10',
      'in_nucleo_scree',
    ];

    const rows: string[] = [headers.join(',')];

    stimuli.forEach(stim => {
      const stimResponses = activeResponses.filter(r => r.stimulusId === stim.id);
      const res = calculateTraditionalRSN(
        stimResponses,
        rules,
        applyCorrections,
        project?.settings.weightingMethod || 'canonical'
      );

      res.definidoras.forEach(d => {
        rows.push([
          `"${stim.text}"`,
          `"${d.word}"`,
          d.frequency,
          d.relativeFrequency.toFixed(4),
          d.valorM,
          d.valorFMG.toFixed(2),
          d.meanRank.toFixed(2),
          d.isSAM ? 'YES' : 'NO',
          d.isNucleo ? 'YES' : 'NO',
        ].join(','));
      });
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `RSN_Definidoras_Summary_${currentProjectId}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 3. Export Co-occurrence Matrix CSV for selected stimulus
  const handleExportMatrixCsv = () => {
    const activeStim = stimuli.find(s => s.id === selectedStimulusId) || stimuli[0];
    if (!activeStim) return;

    const stimResponses = activeResponses.filter(r => r.stimulusId === activeStim.id);
    const binary = buildBinaryResponseMatrix(stimResponses, rules, true);
    const matrix = buildCooccurrenceMatrix(binary);
    const vocabulary = binary.words;

    const rows: string[] = [];
    rows.push(['word', ...vocabulary].map(w => `"${w}"`).join(','));

    vocabulary.forEach((w: string, i: number) => {
      const row = [`"${w}"`, ...matrix[i]];
      rows.push(row.join(','));
    });

    const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `RSN_Cooccurrence_${activeStim.text}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 4. Export JSON Full Study
  const handleExportJson = () => {
    const data = {
      project,
      stimuli,
      normalizationRules: rules,
      participantSessions: sessions,
      responses: responses,
      exportedAt: new Date().toISOString(),
      platform: 'Redes Semánticas Naturales (RSN) Scientific Platform',
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `RSN_Study_Backup_${currentProjectId}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // 5. Generate Scientific PDF Report
  const handleGeneratePdf = () => {
    setIsGeneratingPdf(true);
    try {
      const doc = new jsPDF({ unit: 'pt', format: 'letter' });
      const pageWidth = doc.internal.pageSize.getWidth();
      let y = 40;

      // Header Banner
      doc.setFillColor(30, 41, 59); // slate-800
      doc.rect(0, 0, pageWidth, 60, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text('INFORME CIENTÍFICO DE REDES SEMÁNTICAS NATURALES', 40, 36);

      y = 85;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(15, 23, 42);
      doc.text(project?.title || 'Estudio de Redes Semánticas Naturales', 40, y);

      y += 18;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      doc.text(`Investigador: ${project?.researcher || 'N/A'}  |  Institución: ${project?.institution || 'N/A'}`, 40, y);
      y += 14;
      doc.text(`Fecha del Reporte: ${new Date().toLocaleDateString()}  |  Participantes Válidos: N = ${activeSessions.length}`, 40, y);

      y += 24;
      doc.setDrawColor(226, 232, 240);
      doc.line(40, y, pageWidth - 40, y);

      // Section: Methodological Parameters
      y += 20;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42);
      doc.text('1. PARÁMETROS METODOLÓGICOS Y RIGOR PSICOMÉTRICO', 40, y);

      y += 16;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(51, 65, 85);
      doc.text(`• Modelo de Red: Tradición Mexicana (Figueroa et al., 1981; Valdez Medina, 1998)`, 45, y);
      y += 13;
      doc.text(`• Función de Ponderación: VS(r) = 11 - r (r = 1...10). Posición 1 = 10 pts, Posición 10 = 1 pto.`, 45, y);
      y += 13;
      doc.text(`• Criterio de Corte para Núcleo: Prueba de Sedimentación (Scree Test de Cattell, 1966).`, 45, y);
      y += 13;
      doc.text(`• Análisis Topológico de Grafos: Proyección no dirigida de coocurrencia (Siew et al., 2019).`, 45, y);

      // Process each stimulus
      const applyCorrections = project?.settings?.includeCorrectionsInAnalysis !== false;
      stimuli.forEach((stim, sIdx) => {
        const stimResponses = activeResponses.filter(r => r.stimulusId === stim.id);
        const traditional = calculateTraditionalRSN(
          stimResponses,
          rules,
          applyCorrections,
          project?.settings.weightingMethod || 'canonical'
        );

        if (y > 650) {
          doc.addPage();
          y = 50;
        }

        y += 24;
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42);
        doc.text(`2.${sIdx + 1}. RESULTADOS PARA EL ESTÍMULO: "${stim.text}"`, 40, y);

        y += 16;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(51, 65, 85);
        doc.text(
          `Riqueza de Red (Valor J): ${traditional.valorJ}  |  Peso Máximo (M_max): ${traditional.maxM}  |  Gradiente Semántico (G): ${traditional.valorG}  |  Núcleo: ${traditional.nucleoSet.length} palabras`,
          45,
          y
        );

        // Table Header
        y += 16;
        doc.setFillColor(241, 245, 249);
        doc.rect(40, y - 10, pageWidth - 80, 16, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(30, 41, 59);
        doc.text('Jer.', 45, y);
        doc.text('Palabra Definidora', 75, y);
        doc.text('FA', 220, y);
        doc.text('Valor M (PS)', 270, y);
        doc.text('FMG (%)', 350, y);
        doc.text('En Núcleo', 430, y);

        // Table Rows (Top SAM)
        doc.setFont('helvetica', 'normal');
        traditional.samSet.forEach((def, rIdx) => {
          y += 14;
          doc.setTextColor(51, 65, 85);
          doc.text(`${rIdx + 1}`, 45, y);
          doc.text(def.word.toUpperCase(), 75, y);
          doc.text(`${def.frequency}`, 220, y);
          doc.text(`${def.valorM}`, 270, y);
          doc.text(`${def.valorFMG.toFixed(1)}%`, 350, y);
          doc.text(def.isNucleo ? 'SÍ (Punto de inflexión)' : 'No', 430, y);
        });
      });

      // Section APA References
      if (y > 600) {
        doc.addPage();
        y = 50;
      }
      y += 30;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text('REFERENCIAS BIBLIOGRÁFICAS METODOLÓGICAS (APA 7)', 40, y);

      y += 14;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(100, 116, 139);
      doc.text('• Figueroa, J. G., González, E. G., & Solís, V. M. (1981). Una aproximación al problema del significado: Las redes semánticas naturales. Revista Latinoamericana de Psicología, 13(3), 447-458.', 40, y);
      y += 11;
      doc.text('• Reyes-Lagunes, I. (1993). Las redes semánticas naturales, su conceptualización y utilización en la construcción de instrumentos psicológicos. Revista de Psicología Social y Personalidad, 9(1), 81-97.', 40, y);
      y += 11;
      doc.text('• Siew, C. S., Wulff, D. U., Beckage, N. M., & Kenett, Y. N. (2019). Cognitive network science: A review of research on cognition through the lens of network representations, processes, and dynamics. Complexity, 2019, 1-24.', 40, y);
      y += 11;
      doc.text('• Valdez Medina, J. L. (1998). Las redes semánticas naturales: Usos y aplicaciones en psicología social. Universidad Autónoma del Estado de México.', 40, y);

      doc.save(`RSN_Informe_Cientifico_${currentProjectId}.pdf`);
    } catch (err) {
      console.error(err);
      alert('Error al generar el informe PDF.');
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <AdminLayout activeProjectId={currentProjectId}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Download className="w-6 h-6 text-primary-600" />
              Exportación de Datos y Reportes Científicos
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Descarga bases de datos crudas, matrices de coocurrencia e informes reproducibles en PDF con rigor APA 7.
            </p>
          </div>
        </div>

        {/* Export Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: Raw Associations CSV */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Base de Datos Completa (Asociaciones Crudas)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Archivo CSV con <strong>1 renglón por cada palabra asociada</strong>. Incluye ID anónimo,
                estímulo, palabra original, forma normalizada, jerarquía asignada, peso semántico $VS(r)$,
                tiempos milimétricos de escritura y confirmación.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleExportRawCsv}
                className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar CSV de Asociaciones ({responses.reduce((a, r) => a + r.associations.length, 0)} filas)
              </button>
            </div>
          </div>

          {/* Card 2: Summary Definidoras CSV */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-primary-50 text-primary-600 flex items-center justify-center">
                <Table className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Resumen de Indicadores Tradicionales RSN
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Archivo CSV consolidado por estímulo. Incluye Frecuencia de Aparición (FA), Peso Semántico (Valor M),
                Distancia Semántica Cuantitativa (FMG %), Jerarquía Media, pertenencia al Conjunto SAM y corte de Scree test.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleExportDefinidorasCsv}
                className="w-full py-2.5 px-4 bg-primary-600 hover:bg-primary-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar CSV de Definidoras RSN
              </button>
            </div>
          </div>

          {/* Card 3: Co-occurrence Matrix */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Matriz Cuadrada de Coocurrencias (Grafos)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Matriz simétrica $V \times V$ de coocurrencia entre las principales palabras definidoras.
                Compatible con Gephi, Pajek, UCINET, NetworkX o paquete R SemNeT.
              </p>

              <div className="pt-1">
                <label className="text-[11px] font-bold text-slate-700 block mb-1">
                  Seleccionar Estímulo:
                </label>
                <select
                  value={selectedStimulusId}
                  onChange={e => setSelectedStimulusId(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-slate-50 font-bold"
                >
                  {stimuli.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.text}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={handleExportMatrixCsv}
                className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Download className="w-4 h-4" />
                Descargar Matriz de Coocurrencia (CSV)
              </button>
            </div>
          </div>

          {/* Card 4: Scientific PDF Report */}
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                <FileText className="w-5 h-5" />
              </div>
              <h3 className="text-base font-black text-slate-900 tracking-tight">
                Informe Científico Reproducible (PDF)
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Documento formal que incluye portada con metadatos del estudio, parámetros metodológicos,
                tablas de resultados (J, M, FMG, SAM, Núcleo), métricas de grafos y citas en formato APA 7.
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={handleGeneratePdf}
                disabled={isGeneratingPdf}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4" />
                {isGeneratingPdf ? 'Generando PDF...' : 'Generar Informe PDF Reproducible'}
              </button>
            </div>
          </div>
        </div>

        {/* Card 5: Full JSON Dump */}
        <div className="bg-slate-900 text-slate-200 p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Database className="w-4 h-4 text-primary-400" />
              Copia de Seguridad y Archivo de Estudio Completo (JSON)
            </h4>
            <p className="text-xs text-slate-400">
              Exporta toda la estructura del proyecto: estímulos, reglas de lematización, sesiones crudas y marcas temporales en JSON.
            </p>
          </div>
          <button
            onClick={handleExportJson}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-colors"
          >
            <FileCode className="w-4 h-4" />
            Descargar JSON Completo
          </button>
        </div>
      </div>
    </AdminLayout>
  );
};
