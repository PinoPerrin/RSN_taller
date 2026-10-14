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
