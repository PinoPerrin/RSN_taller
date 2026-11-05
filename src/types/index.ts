// Types and interfaces for the Natural Semantic Networks (RSN) Platform

export type ProjectStatus = 'draft' | 'published' | 'paused' | 'closed' | 'archived';

export type WeightingMethod = 'canonical' | 'proportional'; // canonical: VS(r) = 11 - r; proportional: VS(r) = (m + 1 - r)/m * 10

export type CutoffCriterion = 'scree_test' | 'sam_10' | 'sam_15' | 'fmg_threshold';

export interface DemographicField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'radio';
  options?: string[];
  required: boolean;
}

export interface ProjectSettings {
  maxAssociations: number; // default: 10
  timeLimitSeconds: number; // default: 60
  randomizeStimuli: boolean; // default: false
  allowMultiwordExpressions: boolean; // default: false (words only)
  weightingMethod: WeightingMethod; // default: 'canonical'
  defaultCutoffCriterion: CutoffCriterion; // default: 'scree_test'
  requireFullRanking: boolean; // default: true
  allowAnonymous: boolean; // default: true
  collectDemographics: boolean; // default: false
  demographicFields: DemographicField[];
  includeCorrectionsInAnalysis?: boolean; // default: true
}

export interface Stimulus {
  id: string;
  projectId: string;
  text: string;
  order: number;
  timeLimitSeconds?: number;
  maxAssociations?: number;
}

export interface Project {
  id: string;
  publicId: string;
  ownerUid?: string; // UID of creator ('admin' or specific user UID)
  ownerEmail?: string;
  isArchived?: boolean;
  title: string;
  description: string;
  researcher: string;
  institution: string;
  objective: string;
  language: string; // 'es', 'en', etc.
  privacyNotice: string;
  consentText: string;
  welcomeMessage: string;
  thankYouMessage: string;
  status: ProjectStatus;
  version: number;
  settings: ProjectSettings;
  createdAt: string;
  updatedAt: string;
}

export interface TimingEvent {
  word: string;
  startedTypingMs?: number;
  confirmedMs: number; // time from stimulus presentation
  typingDurationMs?: number;
}

export interface RawAssociation {
  rawWord: string;
  canonicalWord?: string;
  generationOrder: number; // 1 to m
  rank: number; // 1 to m
  timing: TimingEvent;
}

export interface ParticipantSession {
  id: string;
  projectId: string;
  anonymousId: string;
  status: 'started' | 'in_progress' | 'completed' | 'abandoned';
  consentAccepted: boolean;
  demographics?: Record<string, any>;
  startedAt: string;
  completedAt?: string;
  totalDurationMs?: number;
  userAgent?: string;
  flags: {
    visibilityLossCount: number;
    suspiciousTiming: boolean;
    excludedByAdmin: boolean;
    exclusionReason?: string;
  };
}

export interface StimulusResponse {
  id: string;
  sessionId: string;
  projectId: string;
  stimulusId: string;
  stimulusText: string;
  associations: RawAssociation[];
  completedAt: string;
  totalGenerationTimeMs: number;
  rankingTimeMs: number;
  wordCount: number;
}

export interface NormalizationRule {
  id: string;
  projectId: string;
  rawForm: string;
  canonicalForm: string;
  category?: string;
  author: string;
  reason: string;
  createdAt: string;
  active: boolean;
}

// Traditional RSN Analysis Output
export interface DefinidoraStats {
  word: string;
  frequency: number; // FA
  relativeFrequency: number; // FA / N
  valorM: number; // Peso Semántico PS
  valorFMG: number; // Distancia Semántica Cuantitativa DSC %
  meanRank: number; // Jerarquía media descriptiva
  isSAM: boolean; // Top-10
  isNucleo: boolean; // Scree test cutoff
  rankDistribution: Record<number, number>; // frequency at rank r
}

export interface TraditionalRSNResults {
  stimulusId: string;
  stimulusText: string;
  participantCount: number;
  valorJ: number; // Total different definidoras
  maxM: number;
  valorG: number; // Figueroa/Valdez gradient
  screeCutoffIndex: number;
  definidoras: DefinidoraStats[];
  samSet: DefinidoraStats[];
  nucleoSet: DefinidoraStats[];
  weightingSchemeUsed: WeightingMethod;
  normalized: boolean;
  calculatedAt: string;
}

// Graph Analysis Output
export interface GraphNode {
  id: string;
  label: string;
  frequency: number;
  valorM?: number;
  valorFMG?: number;
  degree: number;
  weightedDegree: number; // strength
  betweennessCentrality: number;
  closenessCentrality: number;
  communityId: number;
  isNucleo?: boolean;
}

export interface GraphEdge {
  source: string;
  target: string;
  weight: number; // cooccurrence count
  jaccard: number; // normalized similarity
}

export interface ModernGraphResults {
  stimulusId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  nodeCount: number;
  edgeCount: number;
  density: number;
  averageDegree: number;
  averageShortestPathLength: number; // ASPL
  clusteringCoefficient: number; // CC
  modularityQ: number; // Newman's Q
  communityCount: number;
  componentCount: number;
  largestComponentRatio: number;
  calculatedAt: string;
}

// Comparative Analysis Output
export interface ComparisonResults {
  titleA: string;
  titleB: string;
  sharedWords: string[];
  exclusiveWordsA: string[];
  exclusiveWordsB: string[];
  jaccardVocabularySimilarity: number;
  pearsonMCorrelation: number;
  valorJDifference: number;
  chiSquareJ: {
    statistic: number;
    pValue: number;
    degreesOfFreedom: number;
  };
  metricsA: {
    participantCount: number;
    valorJ: number;
    maxM: number;
    valorG: number;
    nucleoSize: number;
  };
  metricsB: {
    participantCount: number;
    valorJ: number;
    maxM: number;
    valorG: number;
    nucleoSize: number;
  };
}

// AI-Assisted Semantic Interpretation Output
export interface ProposedSemanticField {
  fieldName: string;
  description: string;
  words: string[];
}

export interface StimulusSemanticReport {
  stimulusId: string;
  stimulusText: string;
  participantCount: number;
  responseCount: number;
  valorJ: number;
  valorG: number;
  maxM: number;
  screeCutoffIndex: number;
  concentrationRatio: number; // e.g. % of M weight in core
  // A. Caracterización General
  generalCharacterization: string;
  // B. Núcleos Semánticos y Campos de Significado
  semanticCores: {
    centralWords: Array<{ word: string; valorM: number; valorFMG: number; frequency: number }>;
    secondaryWords: Array<{ word: string; valorM: number; valorFMG: number; frequency: number }>;
    peripheralWords: Array<{ word: string; valorM: number; valorFMG: number; frequency: number }>;
    proposedSemanticFields: ProposedSemanticField[];
    text: string;
  };
  // C. Connotación Semántica Predominante
  connotation: {
    valenciaTendency: 'positiva' | 'negativa' | 'mixta' | 'neutra';
    natureTendency: 'corporal' | 'afectiva_emocional' | 'social_relacional' | 'cognitiva_abstracta' | 'mixta';
    abstractionTendency: 'concreta' | 'abstracta' | 'balanceada';
    keyEmergentThemes: string[];
    text: string;
    psychometricDisclaimer: string;
  };
  // D. Relaciones Pathfinder
  pathfinderAnalysis: {
    nodeCount: number;
    edgeCount: number;
    density: number;
    hubs: Array<{ word: string; degree: number }>;
    bridges: Array<{ word: string; role: string }>;
    isolatedOrLeafs: Array<{ word: string }>;
    metricDocumentation: {
      proximityMatrixDescription: string;
      wMeaning: string;
      isDistanceOrSimilarity: string;
      rParam: string;
      qParam: string;
    };
    text: string;
    structuralDisclaimer: string;
  };
  // E. Síntesis Interpretativa (100-150 palabras)
  synthesis: string;
}

export interface ComparativeSemanticReport {
  stimulus1: { id: string; text: string };
  stimulus2: { id: string; text: string };
  // A. Comparación Cuantitativa
  quantitativeTable: {
    participants1: number;
    participants2: number;
    responses1: number;
    responses2: number;
    valorJ1: number;
    valorJ2: number;
    maxM1: number;
    maxM2: number;
    valorG1: number;
    valorG2: number;
    sharedCount: number;
    exclusive1Count: number;
    exclusive2Count: number;
    sharedPercentage1: number;
    sharedPercentage2: number;
    jaccardIndex: number;
    pearsonCorrelation: number;
    pathfinderDensity1: number;
    pathfinderDensity2: number;
    pathfinderJointDensity: number;
  };
  // B. Análisis de Palabras Compartidas
  sharedWordsAnalysis: {
    similarImportance: Array<{ word: string; fmg1: number; fmg2: number; m1: number; m2: number }>;
    higherInStimulus1: Array<{ word: string; fmg1: number; fmg2: number; m1: number; m2: number }>;
    higherInStimulus2: Array<{ word: string; fmg1: number; fmg2: number; m1: number; m2: number }>;
    pathfinderRoles: Array<{ word: string; degreeJoint: number; degree1: number; degree2: number; interpretation: string }>;
    text: string;
  };
  // C. Diferencias en Campos Semánticos
  semanticFieldsDifferences: {
    sharedFields: string[];
    exclusiveFields1: string[];
    exclusiveFields2: string[];
    connotationContrast: string;
    concreteVsAbstractContrast: string;
    text: string;
  };
  // D. Comparación Estructural Pathfinder
  pathfinderStructuralComparison: {
    singleGraphConditionChecked: boolean;
    structuralDifferences: string;
    jointGraphBridgeRole: string;
    text: string;
  };
  // E. Síntesis Comparativa (150-250 palabras)
  comparativeSynthesis: string;
  // F. Limitaciones de la Interpretación
  limitations: string[];
}

export interface SemanticInterpretationData {
  id: string;
  projectId: string;
  createdAt: string;
  updatedAt: string;
  modelVersion: string;
  dataVersionFingerprint: string;
  promptInstructionsVersion: string;
  status: 'generated' | 'edited_by_admin';
  stimulusReport1: StimulusSemanticReport;
  stimulusReport2: StimulusSemanticReport;
  comparativeReport: ComparativeSemanticReport;
  adminNotes?: string;
}

// User Profiles and Authentication
export type UserRole = 'admin' | 'registered_user';
export type UserStatus = 'active' | 'suspended';
export type MotivoUso =
  | 'practica_academica'
  | 'investigacion'
  | 'tesis'
  | 'docencia'
  | 'exploracion_personal'
  | 'otro';

export interface UserProfile {
  uid: string;
  email: string;
  nombre?: string;
  institucion: string;
  semestre_nivel: string;
  motivo_uso: MotivoUso;
  motivo_detalle?: string;
  role: UserRole;
  status: UserStatus;
  termsAccepted: boolean;
  termsVersion: string;
  privacyAccepted: boolean;
  createdAt: string;
  lastLoginAt: string;
}

// Feedback and Support
export type FeedbackType = 'comment' | 'suggestion' | 'bug' | 'doubt';
export type FeedbackStatus = 'recibido' | 'en_revision' | 'resuelto' | 'cerrado';

export interface FeedbackItem {
  id: string;
  uid: string;
  userEmail: string;
  userName?: string;
  userInstitution?: string;
  type: FeedbackType;
  subject: string;
  description: string;
  relatedProjectId?: string;
  relatedProjectTitle?: string;
  status: FeedbackStatus;
  adminResponse?: string;
  adminResponseAt?: string;
  internalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// Audit Logs for administrative actions
export interface AuditLog {
  id: string;
  adminUid: string;
  adminEmail?: string;
  action: string;
  targetType: 'user' | 'project' | 'feedback' | 'system';
  targetId: string;
  details?: string;
  timestamp: string;
}

// System Aggregated Statistics
export interface SystemStats {
  totalUsers: number;
  recentRegistrations: number;
  activeUsers: number;
  totalProjects: number;
  totalStimuli: number;
  totalResponses: number;
  pendingFeedback: number;
  lastCalculatedAt: string;
}

