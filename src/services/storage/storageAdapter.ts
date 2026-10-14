// Unified Storage and Persistence Adapter (Firebase + Local Storage Fallback)
import {
  Project,
  Stimulus,
  ParticipantSession,
  StimulusResponse,
  NormalizationRule,
  ProjectStatus,
} from '../../types';
import { db, isFirebaseConfigured } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  orderBy,
} from 'firebase/firestore';
import {
  INITIAL_PROJECT,
  INITIAL_STIMULI,
  INITIAL_RESPONSES,
  INITIAL_SESSIONS,
} from './mockData';

// Local storage keys
const STORAGE_PREFIX = 'rsn_platform_';
const KEYS = {
  PROJECTS: `${STORAGE_PREFIX}projects`,
  STIMULI: `${STORAGE_PREFIX}stimuli`,
  RESPONSES: `${STORAGE_PREFIX}responses`,
  SESSIONS: `${STORAGE_PREFIX}sessions`,
  RULES: `${STORAGE_PREFIX}rules`,
};

// In-memory / LocalStorage State Management
class LocalDatabase {
  private listeners = new Set<() => void>();

  constructor() {
    this.initDefaults();
  }

  private initDefaults() {
    if (!localStorage.getItem(KEYS.PROJECTS)) {
      localStorage.setItem(KEYS.PROJECTS, JSON.stringify([INITIAL_PROJECT]));
    }
    if (!localStorage.getItem(KEYS.STIMULI)) {
      localStorage.setItem(KEYS.STIMULI, JSON.stringify(INITIAL_STIMULI));
    }
    if (!localStorage.getItem(KEYS.RESPONSES)) {
      localStorage.setItem(KEYS.RESPONSES, JSON.stringify(INITIAL_RESPONSES));
    }
    if (!localStorage.getItem(KEYS.SESSIONS)) {
      localStorage.setItem(KEYS.SESSIONS, JSON.stringify(INITIAL_SESSIONS));
    }
    if (!localStorage.getItem(KEYS.RULES)) {
      localStorage.setItem(KEYS.RULES, JSON.stringify([]));
    }
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach(cb => cb());
  }

  getProjects(): Project[] {
    try {
      return JSON.parse(localStorage.getItem(KEYS.PROJECTS) || '[]');
    } catch {
      return [INITIAL_PROJECT];
    }
  }

  saveProjects(projects: Project[]) {
    localStorage.setItem(KEYS.PROJECTS, JSON.stringify(projects));
    this.notify();
  }

  getStimuli(projectId?: string): Stimulus[] {
    try {
      const all: Stimulus[] = JSON.parse(localStorage.getItem(KEYS.STIMULI) || '[]');
      return projectId ? all.filter(s => s.projectId === projectId) : all;
    } catch {
      return INITIAL_STIMULI;
    }
  }

  saveStimuli(stimuli: Stimulus[]) {
    localStorage.setItem(KEYS.STIMULI, JSON.stringify(stimuli));
    this.notify();
  }

  getResponses(projectId?: string, stimulusId?: string): StimulusResponse[] {
    try {
      let all: StimulusResponse[] = JSON.parse(localStorage.getItem(KEYS.RESPONSES) || '[]');
      if (projectId) all = all.filter(r => r.projectId === projectId);
      if (stimulusId) all = all.filter(r => r.stimulusId === stimulusId);
      return all;
    } catch {
      return INITIAL_RESPONSES;
    }
  }

  saveResponses(responses: StimulusResponse[]) {
    localStorage.setItem(KEYS.RESPONSES, JSON.stringify(responses));
    this.notify();
  }

  getSessions(projectId?: string): ParticipantSession[] {
    try {
      const all: ParticipantSession[] = JSON.parse(localStorage.getItem(KEYS.SESSIONS) || '[]');
      return projectId ? all.filter(s => s.projectId === projectId) : all;
    } catch {
      return INITIAL_SESSIONS;
    }
  }

  saveSessions(sessions: ParticipantSession[]) {
    localStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
    this.notify();
  }

  getRules(projectId?: string): NormalizationRule[] {
    try {
      const all: NormalizationRule[] = JSON.parse(localStorage.getItem(KEYS.RULES) || '[]');
      return projectId ? all.filter(r => r.projectId === projectId) : all;
    } catch {
      return [];
    }
  }

  saveRules(rules: NormalizationRule[]) {
    localStorage.setItem(KEYS.RULES, JSON.stringify(rules));
    this.notify();
  }
}

export const localDB = new LocalDatabase();

// -------------------------------------------------------------
// Storage Adapter API
// -------------------------------------------------------------

export const storageAdapter = {
  /**
   * Listen to all projects
   */
  subscribeProjects(callback: (projects: Project[]) => void): () => void {
    if (isFirebaseConfigured && db) {
      const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      return onSnapshot(q, snapshot => {
        const list = snapshot.docs.map(doc => doc.data() as Project);
        callback(list);
      });
    }

    callback(localDB.getProjects());
    return localDB.subscribe(() => {
      callback(localDB.getProjects());
    });
  },

  /**
   * Get project by ID or Public ID
   */
  async getProject(idOrPublicId: string): Promise<Project | null> {
    if (isFirebaseConfigured && db) {
      // Try by direct doc ID
      const directRef = doc(db, 'projects', idOrPublicId);
      const directSnap = await getDoc(directRef);
      if (directSnap.exists()) return directSnap.data() as Project;

      // Try by publicId
      const q = query(collection(db, 'projects'), where('publicId', '==', idOrPublicId));
      const qSnap = await getDocs(q);
      if (!qSnap.empty) return qSnap.docs[0].data() as Project;
      return null;
    }

    const projects = localDB.getProjects();
    return projects.find(p => p.id === idOrPublicId || p.publicId === idOrPublicId) || null;
  },

  /**
   * Create or update a project
   */
  async saveProject(project: Project): Promise<void> {
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, 'projects', project.id), project, { merge: true });
      return;
    }

    const projects = localDB.getProjects();
    const idx = projects.findIndex(p => p.id === project.id);
    if (idx >= 0) {
      projects[idx] = { ...projects[idx], ...project, updatedAt: new Date().toISOString() };
    } else {
      projects.unshift(project);
    }
    localDB.saveProjects(projects);
  },

  /**
   * Delete a project and its associated stimuli, responses, and sessions
   */
  async deleteProject(projectId: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      // In firestore, delete doc
      return;
    }
    const projects = localDB.getProjects().filter(p => p.id !== projectId);
    localDB.saveProjects(projects);

    const stimuli = localDB.getStimuli().filter(s => s.projectId !== projectId);
    localDB.saveStimuli(stimuli);

    const responses = localDB.getResponses().filter(r => r.projectId !== projectId);
    localDB.saveResponses(responses);

    const sessions = localDB.getSessions().filter(s => s.projectId !== projectId);
    localDB.saveSessions(sessions);
  },

  /**
   * Update project status (draft, published, paused, closed, archived)
   */
  async setProjectStatus(projectId: string, status: ProjectStatus): Promise<void> {
    if (isFirebaseConfigured && db) {
      await updateDoc(doc(db, 'projects', projectId), {
        status,
        updatedAt: new Date().toISOString(),
      });
      return;
    }

    const projects = localDB.getProjects();
    const project = projects.find(p => p.id === projectId);
    if (project) {
      project.status = status;
      project.updatedAt = new Date().toISOString();
      localDB.saveProjects(projects);
    }
  },

  /**
   * Delete a stimulus
   */
  async deleteStimulus(stimulusId: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      return;
    }
    const stimuli = localDB.getStimuli().filter(s => s.id !== stimulusId);
    localDB.saveStimuli(stimuli);
  },

  /**
   * Stimuli management
   */
  subscribeStimuli(projectId: string, callback: (stimuli: Stimulus[]) => void): () => void {
    if (isFirebaseConfigured && db) {
      const q = query(
        collection(db, `projects/${projectId}/stimuli`),
        orderBy('order', 'asc')
      );
      return onSnapshot(q, snapshot => {
        const list = snapshot.docs.map(doc => doc.data() as Stimulus);
        callback(list);
      });
    }

    callback(localDB.getStimuli(projectId));
    return localDB.subscribe(() => {
      callback(localDB.getStimuli(projectId));
    });
  },

  async saveStimulus(stimulus: Stimulus): Promise<void> {
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, `projects/${stimulus.projectId}/stimuli`, stimulus.id), stimulus, { merge: true });
      return;
    }

    const stimuli = localDB.getStimuli();
    const idx = stimuli.findIndex(s => s.id === stimulus.id);
    if (idx >= 0) {
      stimuli[idx] = stimulus;
    } else {
      stimuli.push(stimulus);
    }
    localDB.saveStimuli(stimuli);
  },

  /**
   * Participant Responses
   */
  subscribeResponses(
    projectId: string,
    stimulusId: string | undefined,
    callback: (responses: StimulusResponse[]) => void
  ): () => void {
    if (isFirebaseConfigured && db) {
      const baseCol = collection(db, `projects/${projectId}/responses`);
      const q = stimulusId ? query(baseCol, where('stimulusId', '==', stimulusId)) : baseCol;
      return onSnapshot(q, snapshot => {
        const list = snapshot.docs.map(doc => doc.data() as StimulusResponse);
        callback(list);
      });
    }

    callback(localDB.getResponses(projectId, stimulusId));
    return localDB.subscribe(() => {
      callback(localDB.getResponses(projectId, stimulusId));
    });
  },

  async submitResponse(response: StimulusResponse): Promise<{ success: boolean; message?: string }> {
    // Validate project is published
    const project = await this.getProject(response.projectId);
    if (!project) return { success: false, message: 'Proyecto no encontrado' };
    if (project.status !== 'published') {
      return { success: false, message: `El proyecto no acepta respuestas (Estado: ${project.status})` };
    }

    // Validate associations
    const m = response.associations.length;
    if (m > project.settings.maxAssociations) {
      return { success: false, message: `Número de asociaciones (${m}) excede el límite permitido (${project.settings.maxAssociations})` };
    }

    // Validate ranking bijection 1 to m without duplicates or gaps
    const ranks = response.associations.map(a => a.rank);
    const rankSet = new Set(ranks);
    if (rankSet.size !== m) {
      return { success: false, message: 'Existen jerarquías duplicadas' };
    }
    for (let r = 1; r <= m; r++) {
      if (!rankSet.has(r)) {
        return { success: false, message: `Falta la posición jerárquica ${r}` };
      }
    }

    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, `projects/${response.projectId}/responses`, response.id), response);
      return { success: true };
    }

    const responses = localDB.getResponses();
    responses.push(response);
    localDB.saveResponses(responses);

    // Update session completed words
    const sessions = localDB.getSessions();
    const session = sessions.find(s => s.id === response.sessionId);
    if (session) {
      session.status = 'completed';
      session.completedAt = new Date().toISOString();
      localDB.saveSessions(sessions);
    }

    return { success: true };
  },

  /**
   * Sessions management
   */
  subscribeSessions(projectId: string, callback: (sessions: ParticipantSession[]) => void): () => void {
    if (isFirebaseConfigured && db) {
      const q = collection(db, `projects/${projectId}/sessions`);
      return onSnapshot(q, snapshot => {
        const list = snapshot.docs.map(doc => doc.data() as ParticipantSession);
        callback(list);
      });
    }

    callback(localDB.getSessions(projectId));
    return localDB.subscribe(() => {
      callback(localDB.getSessions(projectId));
    });
  },

  async createSession(session: ParticipantSession): Promise<void> {
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, `projects/${session.projectId}/sessions`, session.id), session);
      return;
    }

    const sessions = localDB.getSessions();
    sessions.push(session);
    localDB.saveSessions(sessions);
  },

  async updateSessionFlags(
    sessionId: string,
    flags: Partial<ParticipantSession['flags']>
  ): Promise<void> {
    if (isFirebaseConfigured && db) {
      // update in firestore
      return;
    }
    const sessions = localDB.getSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      session.flags = { ...session.flags, ...flags };
      localDB.saveSessions(sessions);
    }
  },

  /**
   * Normalization Rules
   */
  subscribeRules(projectId: string, callback: (rules: NormalizationRule[]) => void): () => void {
    if (isFirebaseConfigured && db) {
      const q = collection(db, `projects/${projectId}/rules`);
      return onSnapshot(q, snapshot => {
        const list = snapshot.docs.map(doc => doc.data() as NormalizationRule);
        callback(list);
      });
    }

    callback(localDB.getRules(projectId));
    return localDB.subscribe(() => {
      callback(localDB.getRules(projectId));
    });
  },

  async saveRule(rule: NormalizationRule): Promise<void> {
    if (isFirebaseConfigured && db) {
      await setDoc(doc(db, `projects/${rule.projectId}/rules`, rule.id), rule, { merge: true });
      return;
    }

    const rules = localDB.getRules();
    const idx = rules.findIndex(r => r.id === rule.id);
    if (idx >= 0) {
      rules[idx] = rule;
    } else {
      rules.push(rule);
    }
    localDB.saveRules(rules);
  },

  async deleteRule(ruleId: string): Promise<void> {
    if (isFirebaseConfigured && db) {
      // In Firestore, rule would be deleted or marked active=false
      return;
    }
    const rules = localDB.getRules().filter(r => r.id !== ruleId);
    localDB.saveRules(rules);
  },
};
