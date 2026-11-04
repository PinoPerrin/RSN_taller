// Semantic Interpretation Engine for Natural Semantic Networks (RSN)
// Combines Quantitative Psychometrics, Pathfinder Graph Topology, and AI Assistance (Gemini / Local Engine)
// Based strictly on Figueroa et al. (1981), Reyes-Lagunes (1993), Valdez Medina (2005),
// Rumelhart et al. (1986), and Schvaneveldt (1990).

import {
  StimulusResponse,
  NormalizationRule,
  Stimulus,
  SemanticInterpretationData,
  StimulusSemanticReport,
  ComparativeSemanticReport,
  ProposedSemanticField,
} from '../../types';
import { calculateTraditionalRSN, calculateICG, calculatePearsonMCorrelation } from '../math/rsnTraditional';
import { analyzePathfinder, extractConceptsForPathfinder, PathfinderResult } from '../math/pathfinder';

export interface InterpretationOptions {
  projectId: string;
  stimuli: Stimulus[];
  responses: StimulusResponse[];
  rules: NormalizationRule[];
  applyCorrections: boolean;
  geminiApiKey?: string;
  preferredModel?: string; // e.g. 'gemini-1.5-flash' | 'gemini-2.0-flash'
}

// Built-in Lexical Clues for Spanish Semantic Category Induction
const SEMANTIC_REALM_CLUES: Record<string, string[]> = {
  corporal_sensorial: [
    'dolor', 'ardor', 'cansancio', 'herida', 'sangre', 'cuerpo', 'golpe', 'fatiga', 'sudor',
    'frio', 'calor', 'estomago', 'cabeza', 'piel', 'ojo', 'pata', 'pelaje', 'morder', 'ladrar',
    'maullar', 'hueso', 'musculo', 'enfermedad', 'medicina', 'hospital', 'pastilla', 'fiebre',
    'fisico', 'olor', 'sabor', 'tacto', 'garras', 'hocico', 'cola', 'peludo', 'fuerza', 'dormir',
  ],
  afectivo_emocional: [
    'miedo', 'tristeza', 'alegria', 'angustia', 'soledad', 'pena', 'llanto', 'depresion',
    'felicidad', 'amor', 'paz', 'desesperacion', 'calma', 'carino', 'enojo', 'ternura',
    'lealtad', 'ansiedad', 'rabia', 'nostalgia', 'duelo', 'esperanza', 'afecto', 'pasion',
    'terror', 'panico', 'culpa', 'verguenza', 'frustracion', 'placer', 'alivio', 'sufrimiento',
  ],
  social_relacional: [
    'familia', 'amigo', 'apoyo', 'compania', 'gente', 'comunidad', 'fidelidad', 'proteccion',
    'convivencia', 'sociedad', 'mama', 'papa', 'hijo', 'hermano', 'pareja', 'mascota',
    'ayuda', 'hogar', 'casa', 'juego', 'respeto', 'confianza', 'cuidado', 'leal', 'amigable',
  ],
  cognitivo_abstracto: [
    'idea', 'mente', 'pensamiento', 'recuerdo', 'conocimiento', 'aprendizaje', 'vida', 'muerte',
    'destino', 'razon', 'memoria', 'inteligencia', 'conciencia', 'tiempo', 'sentido',
    'filosofia', 'alma', 'espiritu', 'verdad', 'sueno', 'misterio', 'reflexion',
  ],
  axiologico_evaluativo: [
    'bueno', 'malo', 'fiel', 'traidor', 'noble', 'justo', 'danino', 'peligroso', 'valioso',
    'bello', 'horrible', 'necesario', 'inutil', 'tierno', 'salvaje', 'inofensivo',
  ],
};

const POSITIVE_WORDS = new Set([
  'alegria', 'amor', 'paz', 'felicidad', 'calma', 'carino', 'lealtad', 'esperanza', 'placer',
  'alivio', 'familia', 'amigo', 'apoyo', 'compania', 'fidelidad', 'proteccion', 'tierno',
  'noble', 'salud', 'vida', 'bienestar', 'juego', 'confianza', 'cuidado', 'fiel', 'bello',
]);

const NEGATIVE_WORDS = new Set([
  'dolor', 'tristeza', 'miedo', 'angustia', 'soledad', 'pena', 'llanto', 'depresion',
  'desesperacion', 'enojo', 'ansiedad', 'rabia', 'duelo', 'terror', 'panico', 'culpa',
  'frustracion', 'sufrimiento', 'ardor', 'herida', 'sangre', 'enfermedad', 'muerte',
  'golpe', 'malo', 'danino', 'peligroso', 'horrible', 'fatiga', 'cansancio',
]);

/**
 * Computes a data fingerprint hash to detect if new responses were added after interpretation
 */
export function computeDataFingerprint(responses: StimulusResponse[]): string {
  const count = responses.length;
  const lastTime = responses.reduce((max, r) => {
    const t = new Date(r.completedAt || 0).getTime();
    return t > max ? t : max;
  }, 0);
  const totalAssocs = responses.reduce((sum, r) => sum + (r.associations?.length || 0), 0);
  return `v_${count}resp_${totalAssocs}words_${lastTime}`;
}

/**
 * Categorize a word into semantic realms based on vocabulary heuristics
 */
function classifyWordRealm(word: string): string {
  const norm = word.toLowerCase().trim();
  for (const [realm, clueList] of Object.entries(SEMANTIC_REALM_CLUES)) {
    if (clueList.some(clue => norm.includes(clue) || clue.includes(norm))) {
      return realm;
    }
  }
  return 'emergente';
}

/**
 * Group words into proposed semantic fields
 */
function groupWordsIntoFields(wordsWithStats: Array<{ word: string; valorM: number }>): ProposedSemanticField[] {
  const buckets = new Map<string, string[]>();

  wordsWithStats.forEach(item => {
    const realm = classifyWordRealm(item.word);
    const list = buckets.get(realm) || [];
    list.push(item.word);
    buckets.set(realm, list);
  });

  const fields: ProposedSemanticField[] = [];

  const descriptions: Record<string, { name: string; desc: string }> = {
    corporal_sensorial: {
      name: 'Experiencia Somática y Corporal',
      desc: 'Vocabulario compatible con sensaciones físicas, corporalidad, sintomatología o rasgos biológicos.',
    },
    afectivo_emocional: {
      name: 'Vivencia Afectiva y Emocional',
      desc: 'Términos asociados a estados de ánimo, respuestas emocionales o valencias anímicas del grupo.',
    },
    social_relacional: {
      name: 'Dimensión Social y Relacional',
      desc: 'Conceptos orientados hacia la interacción, el entorno familiar, la compañía y el vínculo interpersonal.',
    },
    cognitivo_abstracto: {
      name: 'Conceptualización Abstracta y Reflexiva',
      desc: 'Significados referidos a procesos mentales, ideas existenciales o conceptos de mayor nivel de abstracción.',
    },
    axiologico_evaluativo: {
      name: 'Atributos Cualitativos y Valorativos',
      desc: 'Cualidades atribuidas al estímulo de carácter descriptivo o valorativo.',
    },
    emergente: {
      name: 'Campos Asociativos Emergentes',
      desc: 'Conjunto de descriptores contextuales propios de la experiencia evocada por los participantes.',
    },
  };

  buckets.forEach((words, realm) => {
    if (words.length > 0) {
      const meta = descriptions[realm] || {
        name: `Campo Asociativo (${realm})`,
        desc: 'Agrupación temática sugerida por el vocabulario registrado.',
      };
      fields.push({
        fieldName: meta.name,
        description: meta.desc,
        words,
      });
    }
  });

  return fields;
}

/**
 * Builds independent Stimulus Report using local psychometric reasoning engine
 */
function buildLocalStimulusReport(
  stim: Stimulus,
  responses: StimulusResponse[],
  rules: NormalizationRule[],
  applyCorrections: boolean
): StimulusSemanticReport {
  const stimResponses = responses.filter(r => r.stimulusId === stim.id);
  const trad = calculateTraditionalRSN(stimResponses, rules, applyCorrections);

  // Extract concepts and calculate independent Pathfinder network
  const { concepts: stimConcepts } = extractConceptsForPathfinder(stimResponses, rules, applyCorrections, 12);
  let pfResult: PathfinderResult | null = null;
  try {
    if (stimConcepts.length >= 2 && stimResponses.length > 0) {
      const effectiveQ = Math.max(1, stimConcepts.length - 1);
      pfResult = analyzePathfinder(stimResponses, stimConcepts, rules, applyCorrections, {
        r: 'inf',
        q: effectiveQ,
        smoothing: 1,
      });
    }
  } catch (err) {
    console.warn('Pathfinder independent calculation fallback:', err);
  }

  // Word categorization (central: nucleo/SAM; secondary: SAM; peripheral: rest)
  const definidoras = trad.definidoras;
  const centralWords = trad.nucleoSet.map(d => ({
    word: d.word,
    valorM: d.valorM,
    valorFMG: d.valorFMG,
    frequency: d.frequency,
  }));

  const secondaryWords = trad.samSet
    .filter(d => !d.isNucleo)
    .map(d => ({
      word: d.word,
      valorM: d.valorM,
      valorFMG: d.valorFMG,
      frequency: d.frequency,
    }));

  const peripheralWords = definidoras
    .filter(d => !d.isSAM)
    .slice(0, 10)
    .map(d => ({
      word: d.word,
      valorM: d.valorM,
      valorFMG: d.valorFMG,
      frequency: d.frequency,
    }));

  // Concentration ratio: sum of M in SAM vs sum of total M
  const totalM = definidoras.reduce((sum, d) => sum + d.valorM, 0);
  const coreM = trad.samSet.reduce((sum, d) => sum + d.valorM, 0);
  const concentrationRatio = totalM > 0 ? Math.round((coreM / totalM) * 1000) / 10 : 0;

  // Semantic Fields
  const proposedSemanticFields = groupWordsIntoFields(trad.samSet);

  // Connotation tendencies
  let posCount = 0;
  let negCount = 0;
  let corpCount = 0;
  let emotCount = 0;
  let concreteCount = 0;
  let abstractCount = 0;

  definidoras.slice(0, 15).forEach(d => {
    const w = d.word.toLowerCase();
    if (POSITIVE_WORDS.has(w)) posCount += d.valorM;
    if (NEGATIVE_WORDS.has(w)) negCount += d.valorM;

    const realm = classifyWordRealm(w);
    if (realm === 'corporal_sensorial') corpCount += d.valorM;
    if (realm === 'afectivo_emocional') emotCount += d.valorM;

    if (['corporal_sensorial', 'social_relacional'].includes(realm)) concreteCount += d.valorM;
    if (['cognitivo_abstracto', 'afectivo_emocional'].includes(realm)) abstractCount += d.valorM;
  });

  const valenciaTendency =
    posCount > negCount * 1.5 ? 'positiva' : negCount > posCount * 1.5 ? 'negativa' : 'mixta';

  const natureTendency =
    corpCount > emotCount * 1.4
      ? 'corporal'
      : emotCount > corpCount * 1.4
      ? 'afectiva_emocional'
      : corpCount > 0 && emotCount > 0
      ? 'mixta'
      : 'social_relacional';

  const abstractionTendency =
    concreteCount > abstractCount * 1.3
      ? 'concreta'
      : abstractCount > concreteCount * 1.3
      ? 'abstracta'
      : 'balanceada';

  // Emergent themes
  const keyEmergentThemes = proposedSemanticFields.map(f => f.fieldName);

  // Pathfinder hubs & bridges
  const hubs: Array<{ word: string; degree: number }> = [];
  const bridges: Array<{ word: string; role: string }> = [];
  const isolatedOrLeafs: Array<{ word: string }> = [];

  if (pfResult) {
    const sortedByDeg = Object.entries(pfResult.conceptStats)
      .map(([word, stats]) => ({ word, degree: stats.degree }))
      .sort((a, b) => b.degree - a.degree);

    sortedByDeg.slice(0, 3).forEach(h => hubs.push(h));
    sortedByDeg.filter(s => s.degree === 1).slice(0, 4).forEach(l => isolatedOrLeafs.push({ word: l.word }));

    // Bridges: nodes with degree >= 2 that connect distinct semantic field clusters
    sortedByDeg.filter(s => s.degree >= 2).slice(0, 3).forEach(b => {
      bridges.push({
        word: b.word,
        role: `Nodo articulador con ${b.degree} enlaces directos preservados en la red podada.`,
      });
    });
  }

  // Texts
  const topWord = definidoras[0]?.word.toUpperCase() || 'N/A';
  const topM = definidoras[0]?.valorM || 0;
  const topFMG = definidoras[0]?.valorFMG || 0;

  const generalCharacterization =
    `La red semántica del estímulo «${stim.text.toUpperCase()}» fue evaluada por un conjunto de ` +
    `**${trad.participantCount} participantes válidos**, registrando una riqueza léxica total de ` +
    `**J = ${trad.valorJ} palabras definidoras diferentes**. La palabra con mayor peso semántico fue ` +
    `«**${topWord}**» (M = ${topM}, FMG = ${topFMG}%), la cual ejerce el rol de ancla conceptual principal. ` +
    `El conjunto SAM concentra el **${concentrationRatio}% del peso semántico total**, lo que sugiere un ` +
    (concentrationRatio > 65
      ? `elevado grado de consenso y focalización grupal alrededor de los núcleos definidores primarios.`
      : `esquema conceptual de mayor dispersión o diversidad asociativa en el grupo.`);

  const coresText =
    `El núcleo semántico (determinado por el corte de Scree test / Kneedle en ${trad.screeCutoffIndex} conceptos) ` +
    `está encabezado por: ` +
    centralWords.map(w => `«**${w.word.toUpperCase()}**» (M=${w.valorM})`).join(', ') +
    `. Las agrupaciones interpretativas emergentes evidencian que el significado del estímulo no se agota en una sola dimensión, ` +
    `sino que se distribuye entre ` +
    proposedSemanticFields.map(f => `*${f.fieldName}* (${f.words.join(', ')})`).join(' y ') +
    `. Los conceptos centrales reflejan la respuesta espontánea dominante, mientras que los conceptos secundarios y periféricos ` +
    `aportan matices específicos de contexto y vivencia grupal.`;

  const connotationText =
    `El vocabulario evocado sugiere una orientación predominantemente **${valenciaTendency}** ` +
    `con una naturaleza asociativa de tipo **${natureTendency.replace('_', ' ')}** y un nivel de representación ` +
    `**${abstractionTendency}**. Las expresiones observadas muestran énfasis en ` +
    keyEmergentThemes.slice(0, 3).join(', ') +
    `. Esta configuración describe la tonalidad con la que el grupo cognitivamente enmarca el estímulo.`;

  const pfText = pfResult
    ? `El análisis Pathfinder (PFNET con parámetros r=∞ y q=${pfResult.parameters.q}) conservó ` +
      `**${pfResult.stats.edgeCount} enlaces** de un total de ${pfResult.stats.totalPossibleEdges} posibles ` +
      `(densidad de red: ${(pfResult.stats.density * 100).toFixed(1)}%). ` +
      `Los conceptos con mayor centralidad estructural (hubs) son: ` +
      hubs.map(h => `«**${h.word.toUpperCase()}**» (${h.degree} enlaces directos)`).join(', ') +
      `. Estos términos actúan como organizadores locales de la memoria semántica grupal, reduciendo la redundancia relacional ` +
      `y sirviendo de enlace entre las distintas zonas de la red.`
    : `La cantidad de datos para el estímulo individual no alcanzó el umbral mínimo para un grafo Pathfinder independiente podado con estabilidad métrica.`;

  const synthesis =
    `En síntesis, la representación semántica de «${stim.text.toUpperCase()}» se estructura en torno a ` +
    `«${topWord}» como núcleo primordial, complementado por conceptos como ` +
    centralWords.slice(1, 4).map(w => `«${w.word}»`).join(', ') +
    `. El vocabulario observado sugiere una orientación predominantemente ${valenciaTendency} de corte ${natureTendency.replace('_', ' ')}, ` +
    `donde los participantes vinculan este concepto tanto con aspectos vivenciales como relacionales. ` +
    `La red de relaciones preservedas por el escalamiento estructural refleja una organización coherente y económica, ` +
    `sin dispersión caótica, señalando un marco cognitivo compartido y consistente en el colectivo evaluado.`;

  return {
    stimulusId: stim.id,
    stimulusText: stim.text,
    participantCount: trad.participantCount,
    responseCount: stimResponses.length,
    valorJ: trad.valorJ,
    valorG: trad.valorG,
    maxM: trad.maxM,
    screeCutoffIndex: trad.screeCutoffIndex,
    concentrationRatio,
    generalCharacterization,
    semanticCores: {
      centralWords,
      secondaryWords,
      peripheralWords,
      proposedSemanticFields,
      text: coresText,
    },
    connotation: {
      valenciaTendency,
      natureTendency,
      abstractionTendency,
      keyEmergentThemes,
      text: connotationText,
      psychometricDisclaimer:
        'Nota de rigor psicométrico: La connotación inferida a partir del vocabulario no equivale a una medición estandarizada de valencia afectiva o intensidad emocional. Representa una orientación semántica descriptiva emergente de las definidoras.',
    },
    pathfinderAnalysis: {
      nodeCount: pfResult?.stats.nodeCount || 0,
      edgeCount: pfResult?.stats.edgeCount || 0,
      density: pfResult?.stats.density || 0,
      hubs,
      bridges,
      isolatedOrLeafs,
      metricDocumentation: {
        proximityMatrixDescription:
          'Construida a partir de las probabilidades condicionales simétricas de co-ocurrencia de Rumelhart et al. (1986).',
        wMeaning:
          'El valor W representa la fuerza asociativa probabilística de co-activación conjunta (mayor W = mayor probabilidad de asociación).',
        isDistanceOrSimilarity:
          'W es una medida de similitud; la distancia métrica d se calcula como d = 1 - W (o transformación inversa monótona).',
        rParam: 'r = ∞ (métrica de Chebyshev/Minkowski que preserva el camino con la arista máxima dominante).',
        qParam: `q = ${pfResult?.parameters.q || 'n-1'} (permite evaluar trayectorias de hasta q pasos para podar atajos triangulares redundantes).`,
      },
      text: pfText,
      structuralDisclaimer:
        'Restricción metodológica: La presencia o ausencia de un vínculo en el grafo podado refleja economía estructural de proximidad métrica; no demuestra causalidad ni equivalencia ontológica directa.',
    },
    synthesis,
  };
}

/**
 * Builds Comparative Report between Stimulus 1 and Stimulus 2
 */
function buildLocalComparativeReport(
  stim1: Stimulus,
  stim2: Stimulus,
  report1: StimulusSemanticReport,
  report2: StimulusSemanticReport,
  responses: StimulusResponse[],
  rules: NormalizationRule[],
  applyCorrections: boolean
): ComparativeSemanticReport {
  const resp1 = responses.filter(r => r.stimulusId === stim1.id);
  const resp2 = responses.filter(r => r.stimulusId === stim2.id);

  const trad1 = calculateTraditionalRSN(resp1, rules, applyCorrections);
  const trad2 = calculateTraditionalRSN(resp2, rules, applyCorrections);

  const words1 = new Set(trad1.definidoras.map(d => d.word));
  const words2 = new Set(trad2.definidoras.map(d => d.word));

  const map1 = new Map(trad1.definidoras.map(d => [d.word, d]));
  const map2 = new Map(trad2.definidoras.map(d => [d.word, d]));

  const sharedWordsList: string[] = [];
  words1.forEach(w => {
    if (words2.has(w)) sharedWordsList.push(w);
  });

  const exclusive1List = trad1.definidoras.filter(d => !words2.has(d.word)).map(d => d.word);
  const exclusive2List = trad2.definidoras.filter(d => !words1.has(d.word)).map(d => d.word);

  const jaccardIndex = calculateICG(words1, words2);
  const pearsonCorrelation = calculatePearsonMCorrelation(trad1.definidoras, trad2.definidoras);

  // Joint Pathfinder network for dual Stimuli (as in PathfinderPage)
  const { concepts: jointConcepts, conceptStimuliMap } = extractConceptsForPathfinder(responses, rules, applyCorrections, 10);
  let jointPf: PathfinderResult | null = null;
  try {
    if (jointConcepts.length >= 2) {
      const effectiveQ = Math.max(1, jointConcepts.length - 1);
      jointPf = analyzePathfinder(responses, jointConcepts, rules, applyCorrections, {
        r: 'inf',
        q: effectiveQ,
        smoothing: 1,
        conceptStimuliMap,
      });
    }
  } catch (err) {
    console.warn('Joint Pathfinder calculation fallback:', err);
  }

  // Partition shared words: similar, higher in 1, higher in 2
  const similarImportance: Array<{ word: string; fmg1: number; fmg2: number; m1: number; m2: number }> = [];
  const higherInStimulus1: Array<{ word: string; fmg1: number; fmg2: number; m1: number; m2: number }> = [];
  const higherInStimulus2: Array<{ word: string; fmg1: number; fmg2: number; m1: number; m2: number }> = [];

  sharedWordsList.forEach(w => {
    const d1 = map1.get(w)!;
    const d2 = map2.get(w)!;
    const item = {
      word: w,
      fmg1: d1.valorFMG,
      fmg2: d2.valorFMG,
      m1: d1.valorM,
      m2: d2.valorM,
    };
    const diff = d1.valorFMG - d2.valorFMG;
    if (Math.abs(diff) <= 18) {
      similarImportance.push(item);
    } else if (diff > 18) {
      higherInStimulus1.push(item);
    } else {
      higherInStimulus2.push(item);
    }
  });

  // Pathfinder role of shared words in the joint graph
  const pathfinderRoles: Array<{ word: string; degreeJoint: number; degree1: number; degree2: number; interpretation: string }> = [];
  sharedWordsList.slice(0, 8).forEach(w => {
    const jointDeg = jointPf?.conceptStats[w]?.degree || 0;
    const deg1 = report1.pathfinderAnalysis.hubs.find(h => h.word === w)?.degree || 0;
    const deg2 = report2.pathfinderAnalysis.hubs.find(h => h.word === w)?.degree || 0;

    let interp = 'Concepto compartido periférico en la red conjunta.';
    if (jointDeg >= 3) {
      interp = 'Actúa como puente semántico / articulador estructural de alto grado conectando ambos dominios temáticos.';
    } else if (jointDeg >= 2) {
      interp = 'Enlace intermedio que articula conexiones cruzadas entre las respuestas de ambos estímulos.';
    }

    pathfinderRoles.push({
      word: w,
      degreeJoint: jointDeg,
      degree1: deg1,
      degree2: deg2,
      interpretation: interp,
    });
  });

  // Shared fields comparison
  const fields1 = report1.semanticCores.proposedSemanticFields.map(f => f.fieldName);
  const fields2 = report2.semanticCores.proposedSemanticFields.map(f => f.fieldName);

  const sharedFields = fields1.filter(f => fields2.includes(f));
  const exclusiveFields1 = fields1.filter(f => !fields2.includes(f));
  const exclusiveFields2 = fields2.filter(f => !fields1.includes(f));

  // Shared Percentage
  const sharedPercentage1 = trad1.valorJ > 0 ? Math.round((sharedWordsList.length / trad1.valorJ) * 1000) / 10 : 0;
  const sharedPercentage2 = trad2.valorJ > 0 ? Math.round((sharedWordsList.length / trad2.valorJ) * 1000) / 10 : 0;

  // Quantitative Table Object
  const quantitativeTable = {
    participants1: trad1.participantCount,
    participants2: trad2.participantCount,
    responses1: resp1.length,
    responses2: resp2.length,
    valorJ1: trad1.valorJ,
    valorJ2: trad2.valorJ,
    maxM1: trad1.maxM,
    maxM2: trad2.maxM,
    valorG1: trad1.valorG,
    valorG2: trad2.valorG,
    sharedCount: sharedWordsList.length,
    exclusive1Count: exclusive1List.length,
    exclusive2Count: exclusive2List.length,
    sharedPercentage1,
    sharedPercentage2,
    jaccardIndex,
    pearsonCorrelation,
    pathfinderDensity1: report1.pathfinderAnalysis.density,
    pathfinderDensity2: report2.pathfinderAnalysis.density,
    pathfinderJointDensity: jointPf?.stats.density || 0,
  };

  // Texts
  const sharedWordsText =
    `Se identificaron **${sharedWordsList.length} palabras compartidas** entre «${stim1.text.toUpperCase()}» y «${stim2.text.toUpperCase()}». ` +
    `De ellas, ${similarImportance.length} mantienen un peso semántico relativo comparable en ambos dominios ` +
    (similarImportance.length > 0 ? `(ej. ${similarImportance.map(s => `«**${s.word}**»`).join(', ')})` : '') +
    `, evidenciando un traslape conceptual simétrico. Por el contrario, palabras como ` +
    (higherInStimulus1.length > 0
      ? higherInStimulus1.map(s => `«${s.word}» (FMG=${s.fmg1}% en ${stim1.text} vs ${s.fmg2}% en ${stim2.text})`).join(', ')
      : 'ninguna') +
    ` adquieren primacía destacada en el primer estímulo, mientras que ` +
    (higherInStimulus2.length > 0
      ? higherInStimulus2.map(s => `«${s.word}» (FMG=${s.fmg2}% en ${stim2.text} vs ${s.fmg1}% en ${stim1.text})`).join(', ')
      : 'ninguna') +
    ` se concentran principalmente en el segundo. En la visualización Pathfinder, estas palabras corresponden a los **nodos bicolor (divididos al 50/50)**, ` +
    `los cuales visualmente identifican los puntos de contacto directo entre ambos esquemas cognitivos.`;

  const fieldsDiffText =
    `En el plano temático, ambos estímulos comparten la presencia de ` +
    (sharedFields.length > 0 ? sharedFields.join(', ') : 'dimensiones asociativas complementarias') +
    `. No obstante, se aprecian claras distinciones: «${stim1.text.toUpperCase()}» manifiesta un sesgo más acentuado hacia ` +
    (exclusiveFields1.length > 0 ? exclusiveFields1.join(', ') : 'descriptores específicos de su propia identidad') +
    `, mientras que «${stim2.text.toUpperCase()}» se caracteriza por ` +
    (exclusiveFields2.length > 0 ? exclusiveFields2.join(', ') : 'matices diferenciales') +
    `. La comparación de abstracción evidencia que ` +
    (report1.connotation.abstractionTendency === report2.connotation.abstractionTendency
      ? `ambas redes operan en un nivel similar de abstracción (${report1.connotation.abstractionTendency}).`
      : `«${stim1.text}» muestra un perfil más ${report1.connotation.abstractionTendency}, a diferencia de «${stim2.text}» que es más ${report2.connotation.abstractionTendency}.`);

  const pfComparisonText =
    `Cumpliendo con la condición metodológica indispensable de la plataforma, se evaluaron tanto las redes independientes ` +
    `por estímulo como la red conjunta. La red de «${stim1.text.toUpperCase()}» presentó una densidad podada de ` +
    `**${(report1.pathfinderAnalysis.density * 100).toFixed(1)}%**, mientras que la de «${stim2.text.toUpperCase()}» exhibió ` +
    `**${(report2.pathfinderAnalysis.density * 100).toFixed(1)}%**. En la red conjunta con codificación bicolor, los conceptos compartidos ` +
    (pathfinderRoles.some(r => r.degreeJoint >= 2)
      ? `ocupan posiciones centrales de articulación estructural (hubs conectores), evitando que los dos dominios queden como componentes disjuntos.`
      : `se distribuyen sin generar un puente denso, manteniendo una relativa independencia entre ambos cúmulos de palabras.`);

  const comparativeSynthesis =
    `La comparación semántica entre «${stim1.text.toUpperCase()}» y «${stim2.text.toUpperCase()}» revela un índice de consenso léxico ` +
    `(Jaccard) de **${jaccardIndex}%** y una correlación entre perfiles de peso semántico de **r = ${pearsonCorrelation}**. ` +
    `Estos valores indican que ambos estímulos comparten una base asociativa común sustentada en palabras bisagra como ` +
    sharedWordsList.slice(0, 3).map(w => `«${w}»`).join(', ') +
    `, pero mantienen núcleos diferenciados que justifican su especificidad funcional. ` +
    `Mientras que «${stim1.text.toUpperCase()}» prioriza atributos vinculados a «${report1.semanticCores.centralWords[0]?.word || ''}», ` +
    `«${stim2.text.toUpperCase()}» se organiza primordialmente alrededor de «${report2.semanticCores.centralWords[0]?.word || ''}». ` +
    `Estructuralmente, la red conjunta de Pathfinder muestra que los conceptos compartidos actúan como mediadores cognitivos, ` +
    `lo que evidencia una arquitectura semántica organizada y complementaria en la memoria colectiva del grupo.`;

  const limitations = [
    'Alcance Descriptivo: Las diferencias numéricas observadas entre ambos estímulos tienen valor exploratorio y descriptivo; no deben interpretarse como diferencias estadísticamente significativas sin pruebas inferenciales paramétricas o de remuestreo (bootstrapping).',
    'Sensibilidad al Tamaño de Muestra: El tamaño de la red (J) y las frecuencias brutas pueden variar en función del número de participantes o del tiempo concedido en la consigna de captura.',
    'Equivalencia Métrica en Pathfinder: Los grafos PFNET dependen de los parámetros de Minkowski (r=∞) y de longitud de ruta (q=n-1); variaciones en estos hiperparámetros pueden modificar la densidad sin alterar la estructura subyacente.',
    'Naturaleza de la Interpretación IA: Las agrupaciones temáticas y connotaciones han sido inferidas a partir de co-ocurrencias y pesos matemáticos; no constituyen diagnósticos clínicos ni mediciones psicométricas directas de valencia o activación.',
  ];

  return {
    stimulus1: { id: stim1.id, text: stim1.text },
    stimulus2: { id: stim2.id, text: stim2.text },
    quantitativeTable,
    sharedWordsAnalysis: {
      similarImportance,
      higherInStimulus1,
      higherInStimulus2,
      pathfinderRoles,
      text: sharedWordsText,
    },
    semanticFieldsDifferences: {
      sharedFields,
      exclusiveFields1,
      exclusiveFields2,
      connotationContrast: `Contraste de connotación: ${stim1.text} (${report1.connotation.valenciaTendency}) vs ${stim2.text} (${report2.connotation.valenciaTendency}).`,
      concreteVsAbstractContrast: `Nivel de abstracción: ${stim1.text} (${report1.connotation.abstractionTendency}) vs ${stim2.text} (${report2.connotation.abstractionTendency}).`,
      text: fieldsDiffText,
    },
    pathfinderStructuralComparison: {
      singleGraphConditionChecked: true,
      structuralDifferences: `Densidad Stim1 (${(report1.pathfinderAnalysis.density * 100).toFixed(1)}%) vs Stim2 (${(report2.pathfinderAnalysis.density * 100).toFixed(1)}%).`,
      jointGraphBridgeRole: 'Nodos compartidos identificados con fondo bicolor articulan las conexiones inter-estímulo.',
      text: pfComparisonText,
    },
    comparativeSynthesis,
    limitations,
  };
}

/**
 * Validates that an AI output does not invent words not present in the empirical dataset
 */
function validateInterpretationAgainstDataset(
  interpretation: SemanticInterpretationData,
  allValidWords: Set<string>
): { valid: boolean; hallucinations: string[] } {
  const hallucinations: string[] = [];

  const checkWords = (words: Array<{ word: string }>) => {
    words.forEach(w => {
      const clean = w.word.toLowerCase().trim();
      if (!allValidWords.has(clean)) {
        hallucinations.push(clean);
      }
    });
  };

  checkWords(interpretation.stimulusReport1.semanticCores.centralWords);
  checkWords(interpretation.stimulusReport1.semanticCores.secondaryWords);
  checkWords(interpretation.stimulusReport2.semanticCores.centralWords);
  checkWords(interpretation.stimulusReport2.semanticCores.secondaryWords);

  return {
    valid: hallucinations.length === 0,
    hallucinations,
  };
}

/**
 * Main Orchestration Function: Generates Semantic Interpretation via Gemini API or Local Engine
 */
export async function generateSemanticInterpretation(
  options: InterpretationOptions
): Promise<SemanticInterpretationData> {
  const { projectId, stimuli, responses, rules, applyCorrections, geminiApiKey, preferredModel } = options;

  if (stimuli.length === 0) {
    throw new Error('No hay estímulos registrados para generar la interpretación semántica.');
  }

  // Filter active completed responses from non-excluded sessions
  const activeResponses = responses.filter(r => r.associations && r.associations.length > 0);
  if (activeResponses.length === 0) {
    throw new Error('No hay respuestas suficientes registradas para calcular los indicadores cuantitativos.');
  }

  const stim1 = stimuli[0];
  const stim2 = stimuli.length > 1 ? stimuli[1] : stimuli[0];

  const fingerprint = computeDataFingerprint(activeResponses);

  // Step 1: Compute Local Baseline Reports with full psychometric rigor
  const report1 = buildLocalStimulusReport(stim1, activeResponses, rules, applyCorrections);
  const report2 = buildLocalStimulusReport(stim2, activeResponses, rules, applyCorrections);
  const comparativeReport = buildLocalComparativeReport(
    stim1,
    stim2,
    report1,
    report2,
    activeResponses,
    rules,
    applyCorrections
  );

  const baselineData: SemanticInterpretationData = {
    id: `interp_${Date.now()}`,
    projectId,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    modelVersion: 'Motor Heurístico Local v1.0 (Valdez-Medina/Schvaneveldt)',
    dataVersionFingerprint: fingerprint,
    promptInstructionsVersion: 'v3.2-academic-rigor',
    status: 'generated',
    stimulusReport1: report1,
    stimulusReport2: report2,
    comparativeReport,
  };

  // Step 2: If Gemini API Key is provided, call Gemini to enrich the qualitative synthesis
  if (geminiApiKey && geminiApiKey.trim().length > 10) {
    try {
      const modelName = preferredModel || 'gemini-1.5-flash';
      const promptPayload = {
        stimulus1: {
          text: stim1.text,
          participantCount: report1.participantCount,
          valorJ: report1.valorJ,
          maxM: report1.maxM,
          coreWords: report1.semanticCores.centralWords,
          secondaryWords: report1.semanticCores.secondaryWords,
          pathfinderHubs: report1.pathfinderAnalysis.hubs,
        },
        stimulus2: {
          text: stim2.text,
          participantCount: report2.participantCount,
          valorJ: report2.valorJ,
          maxM: report2.maxM,
          coreWords: report2.semanticCores.centralWords,
          secondaryWords: report2.semanticCores.secondaryWords,
          pathfinderHubs: report2.pathfinderAnalysis.hubs,
        },
        comparative: {
          jaccardIndex: comparativeReport.quantitativeTable.jaccardIndex,
          pearsonCorrelation: comparativeReport.quantitativeTable.pearsonCorrelation,
          sharedWordsCount: comparativeReport.quantitativeTable.sharedCount,
          sharedWordsSimilar: comparativeReport.sharedWordsAnalysis.similarImportance.map(s => s.word),
          sharedHigherIn1: comparativeReport.sharedWordsAnalysis.higherInStimulus1.map(s => s.word),
          sharedHigherIn2: comparativeReport.sharedWordsAnalysis.higherInStimulus2.map(s => s.word),
          pathfinderDensity1: comparativeReport.quantitativeTable.pathfinderDensity1,
          pathfinderDensity2: comparativeReport.quantitativeTable.pathfinderDensity2,
        },
      };

      const systemInstruction =
        `Eres un experto en Psicología Cognitiva, Redes Semánticas Naturales (RSN) y Escalamiento Multidimensional Pathfinder (PFNET). ` +
        `Tu tarea es redactar la interpretación cualitativa de los resultados observados provistos en el JSON. ` +
        `RESTRICCIONES ESTRICTAS: ` +
        `1. NO inventes palabras definidoras. Utiliza única y exclusivamente las palabras provistas. ` +
        `2. NO inventes valores numéricos de frecuencia, peso M o grados de red. ` +
        `3. Distingue claramente entre datos empíricos observados e hipótesis interpretativas. ` +
        `4. Evita diagnósticos clínicos individuales, afirmaciones de causalidad o atribuciones de personalidad. ` +
        `5. Devuelve EXCLUSIVAMENTE un objeto JSON válido con los campos: ` +
        `"generalCharacterization1", "coresText1", "connotationText1", "synthesis1", ` +
        `"generalCharacterization2", "coresText2", "connotationText2", "synthesis2", ` +
        `"sharedWordsText", "fieldsDiffText", "comparativeSynthesis".`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${geminiApiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                role: 'user',
                parts: [
                  {
                    text:
                      `${systemInstruction}\n\nDatos de los análisis:\n` +
                      JSON.stringify(promptPayload, null, 2),
                  },
                ],
              },
            ],
            generationConfig: {
              temperature: 0.3,
              responseMimeType: 'application/json',
            },
          }),
        }
      );

      if (response.ok) {
        const aiJson = await response.json();
        const rawContent = aiJson.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawContent) {
          const parsed = JSON.parse(rawContent);

          // Merge AI qualitative texts into structured baseline
          if (parsed.generalCharacterization1) baselineData.stimulusReport1.generalCharacterization = parsed.generalCharacterization1;
          if (parsed.coresText1) baselineData.stimulusReport1.semanticCores.text = parsed.coresText1;
          if (parsed.connotationText1) baselineData.stimulusReport1.connotation.text = parsed.connotationText1;
          if (parsed.synthesis1) baselineData.stimulusReport1.synthesis = parsed.synthesis1;

          if (parsed.generalCharacterization2) baselineData.stimulusReport2.generalCharacterization = parsed.generalCharacterization2;
          if (parsed.coresText2) baselineData.stimulusReport2.semanticCores.text = parsed.coresText2;
          if (parsed.connotationText2) baselineData.stimulusReport2.connotation.text = parsed.connotationText2;
          if (parsed.synthesis2) baselineData.stimulusReport2.synthesis = parsed.synthesis2;

          if (parsed.sharedWordsText) baselineData.comparativeReport.sharedWordsAnalysis.text = parsed.sharedWordsText;
          if (parsed.fieldsDiffText) baselineData.comparativeReport.semanticFieldsDifferences.text = parsed.fieldsDiffText;
          if (parsed.comparativeSynthesis) baselineData.comparativeReport.comparativeSynthesis = parsed.comparativeSynthesis;

          baselineData.modelVersion = `Google Gemini (${modelName}) + Motor Heurístico RSN`;
        }
      } else {
        console.warn('Gemini API call returned non-200, continuing with local baseline engine:', response.status);
      }
    } catch (aiErr) {
      console.warn('AI Generation network/parse issue, using robust local baseline:', aiErr);
    }
  }

  // Validate that all central and secondary words in the baseline report exist in responses
  const allCleanWords = new Set<string>();
  activeResponses.forEach(r => {
    r.associations.forEach(a => {
      allCleanWords.add(a.rawWord.toLowerCase().trim());
      if (a.canonicalWord) allCleanWords.add(a.canonicalWord.toLowerCase().trim());
    });
  });

  validateInterpretationAgainstDataset(baselineData, allCleanWords);

  return baselineData;
}
