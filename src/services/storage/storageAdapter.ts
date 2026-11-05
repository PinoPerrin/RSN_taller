// Unified Storage and Persistence Adapter (Firebase Cloud Firestore + Local Storage Fallback)
import {
  Project,
  Stimulus,
  ParticipantSession,
  StimulusResponse,
  NormalizationRule,
  ProjectStatus,
  SemanticInterpretationData,
  UserProfile,
  UserStatus,
  FeedbackItem,
  FeedbackStatus,
  AuditLog,
  SystemStats,
} from '../../types';
import { db, isFirebaseConfigured, ensureAnonymousAuth } from '../firebase';
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  onSnapshot,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import {
  INITIAL_PROJECT,
  INITIAL_STIMULI,
  INITIAL_RESPONSES,
  INITIAL_SESSIONS,
} from './mockData';

// Local storage keys and universal safe storage wrapper
const STORAGE_PREFIX = 'rsn_platform_';
const KEYS = {
  PROJECTS: `${STORAGE_PREFIX}projects`,
  STIMULI: `${STORAGE_PREFIX}stimuli`,
  RESPONSES: `${STORAGE_PREFIX}responses`,
  SESSIONS: `${STORAGE_PREFIX}sessions`,
  RULES: `${STORAGE_PREFIX}rules`,
  DELETED_PROJECTS: `${STORAGE_PREFIX}deleted_projects`,
  INTERPRETATIONS: `${STORAGE_PREFIX}interpretations`,
  USER_PROFILES: `${STORAGE_PREFIX}user_profiles`,
  FEEDBACK: `${STORAGE_PREFIX}feedback`,
  AUDIT_LOGS: `${STORAGE_PREFIX}audit_logs`,
};

const memoryStore = new Map<string, string>();
const safeStorage = {
  getItem: (key: string): string | null => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        return window.localStorage.getItem(key);
      } catch {
        return memoryStore.get(key) || null;
      }
    }
    return memoryStore.get(key) || null;
  },
  setItem: (key: string, value: string): void => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.setItem(key, value);
        return;
      } catch {
        // Fallback to memoryStore
      }
    }
    memoryStore.set(key, value);
  },
  removeItem: (key: string): void => {
    if (typeof window !== 'undefined' && typeof window.localStorage !== 'undefined') {
      try {
        window.localStorage.removeItem(key);
        return;
      } catch {
        // Fallback to memoryStore
      }
    }
    memoryStore.delete(key);
  },
};

export function getDeletedProjectIds(): Set<string> {
  try {
    const raw = safeStorage.getItem(KEYS.DELETED_PROJECTS);
    if (!raw) return new Set<string>();
    return new Set<string>(JSON.parse(raw));
  } catch {
    return new Set<string>();
  }
}

export function markProjectAsDeleted(projectId: string) {
  const deleted = getDeletedProjectIds();
  deleted.add(projectId);
  if (projectId === INITIAL_PROJECT.id || projectId === INITIAL_PROJECT.publicId) {
    deleted.add(INITIAL_PROJECT.id);
    deleted.add(INITIAL_PROJECT.publicId);
  }
  safeStorage.setItem(KEYS.DELETED_PROJECTS, JSON.stringify(Array.from(deleted)));
}

const isTestEnv = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
const DEFAULT_TIMEOUT_MS = isTestEnv ? 300 : 2500;

const withTimeout = <T>(promise: Promise<T>, ms: number = DEFAULT_TIMEOUT_MS): Promise<T> => {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Firebase operation timed out after ${ms}ms`));
      }, ms);
      if (typeof timer === 'object' && timer !== null && 'unref' in timer) {
        (timer as any).unref();
      }
    }),
  ]);
};

// In-memory / LocalStorage State Management
class LocalDatabase {
  private listeners = new Set<() => void>();

  constructor() {
    this.initDefaults();
  }

  private initDefaults() {
    const deleted = getDeletedProjectIds();
    const isInitialDeleted = deleted.has(INITIAL_PROJECT.id) || deleted.has(INITIAL_PROJECT.publicId);

    if (!safeStorage.getItem(KEYS.PROJECTS)) {
      safeStorage.setItem(KEYS.PROJECTS, JSON.stringify(isInitialDeleted ? [] : [INITIAL_PROJECT]));
    } else if (isInitialDeleted) {
      try {
        const list: Project[] = JSON.parse(safeStorage.getItem(KEYS.PROJECTS) || '[]');
        const cleaned = list.filter(p => p.id !== INITIAL_PROJECT.id && p.publicId !== INITIAL_PROJECT.publicId);
        if (cleaned.length !== list.length) {
          safeStorage.setItem(KEYS.PROJECTS, JSON.stringify(cleaned));
        }
      } catch {}
    }

    if (!safeStorage.getItem(KEYS.STIMULI)) {
      safeStorage.setItem(KEYS.STIMULI, JSON.stringify(isInitialDeleted ? [] : INITIAL_STIMULI));
    } else if (isInitialDeleted) {
      try {
        const list: Stimulus[] = JSON.parse(safeStorage.getItem(KEYS.STIMULI) || '[]');
        const cleaned = list.filter(s => s.projectId !== INITIAL_PROJECT.id && s.projectId !== INITIAL_PROJECT.publicId);
        if (cleaned.length !== list.length) {
          safeStorage.setItem(KEYS.STIMULI, JSON.stringify(cleaned));
        }
      } catch {}
    }

    if (!safeStorage.getItem(KEYS.RESPONSES)) {
      safeStorage.setItem(KEYS.RESPONSES, JSON.stringify(isInitialDeleted ? [] : INITIAL_RESPONSES));
    }
    if (!safeStorage.getItem(KEYS.SESSIONS)) {
      safeStorage.setItem(KEYS.SESSIONS, JSON.stringify(isInitialDeleted ? [] : INITIAL_SESSIONS));
    }
    if (!safeStorage.getItem(KEYS.RULES)) {
      safeStorage.setItem(KEYS.RULES, JSON.stringify([]));
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
    const deleted = getDeletedProjectIds();
    try {
      const list: Project[] = JSON.parse(safeStorage.getItem(KEYS.PROJECTS) || '[]');
      return list.filter(p => !deleted.has(p.id) && !deleted.has(p.publicId));
    } catch {
      return deleted.has(INITIAL_PROJECT.id) ? [] : [INITIAL_PROJECT];
    }
  }

  saveProjects(projects: Project[]) {
    const deleted = getDeletedProjectIds();
    const filtered = projects.filter(p => !deleted.has(p.id) && !deleted.has(p.publicId));
    safeStorage.setItem(KEYS.PROJECTS, JSON.stringify(filtered));
    this.notify();
  }

  getStimuli(projectId?: string): Stimulus[] {
    const deleted = getDeletedProjectIds();
    if (projectId && deleted.has(projectId)) return [];

    try {
      const all: Stimulus[] = JSON.parse(safeStorage.getItem(KEYS.STIMULI) || '[]');
      const valid = all.filter(s => !deleted.has(s.projectId));
      if (!projectId) {
        if (valid.length > 0) return valid;
        return deleted.has(INITIAL_PROJECT.id) ? [] : INITIAL_STIMULI;
      }
      const canonicalPid =
        projectId === INITIAL_PROJECT.publicId || projectId === INITIAL_PROJECT.id
          ? INITIAL_PROJECT.id
          : projectId;
      const filtered = valid.filter(s => s.projectId === canonicalPid || s.projectId === projectId);
      if (filtered.length === 0 && canonicalPid === INITIAL_PROJECT.id) {
        return deleted.has(INITIAL_PROJECT.id) ? [] : INITIAL_STIMULI;
      }
      return filtered;
    } catch {
      return (projectId && deleted.has(projectId)) || deleted.has(INITIAL_PROJECT.id) ? [] : INITIAL_STIMULI;
    }
  }

  saveStimuli(stimuli: Stimulus[]) {
    safeStorage.setItem(KEYS.STIMULI, JSON.stringify(stimuli));
    this.notify();
  }

  getResponses(projectId?: string, stimulusId?: string): StimulusResponse[] {
    try {
      let all: StimulusResponse[] = JSON.parse(safeStorage.getItem(KEYS.RESPONSES) || '[]');
      if (projectId) all = all.filter(r => r.projectId === projectId);
      if (stimulusId) all = all.filter(r => r.stimulusId === stimulusId);
      return all;
    } catch {
      return INITIAL_RESPONSES;
    }
  }

  saveResponses(responses: StimulusResponse[]) {
    safeStorage.setItem(KEYS.RESPONSES, JSON.stringify(responses));
    this.notify();
  }

  getSessions(projectId?: string): ParticipantSession[] {
    try {
      const all: ParticipantSession[] = JSON.parse(safeStorage.getItem(KEYS.SESSIONS) || '[]');
      return projectId ? all.filter(s => s.projectId === projectId) : all;
    } catch {
      return INITIAL_SESSIONS;
    }
  }

  saveSessions(sessions: ParticipantSession[]) {
    safeStorage.setItem(KEYS.SESSIONS, JSON.stringify(sessions));
    this.notify();
  }

  getRules(projectId?: string): NormalizationRule[] {
    try {
      const all: NormalizationRule[] = JSON.parse(safeStorage.getItem(KEYS.RULES) || '[]');
      return projectId ? all.filter(r => r.projectId === projectId) : all;
    } catch {
      return [];
    }
  }

  saveRules(rules: NormalizationRule[]) {
    safeStorage.setItem(KEYS.RULES, JSON.stringify(rules));
    this.notify();
  }

  getInterpretation(projectId: string): SemanticInterpretationData | null {
    try {
      const all: Record<string, SemanticInterpretationData> = JSON.parse(
        safeStorage.getItem(KEYS.INTERPRETATIONS) || '{}'
      );
      return all[projectId] || null;
    } catch {
      return null;
    }
  }

  saveInterpretation(projectId: string, data: SemanticInterpretationData) {
    try {
      const all: Record<string, SemanticInterpretationData> = JSON.parse(
        safeStorage.getItem(KEYS.INTERPRETATIONS) || '{}'
      );
      all[projectId] = data;
      safeStorage.setItem(KEYS.INTERPRETATIONS, JSON.stringify(all));
      this.notify();
    } catch (err) {
      console.warn('Error saving interpretation locally:', err);
    }
  }

  getUserProfiles(): UserProfile[] {
    try {
      return JSON.parse(safeStorage.getItem(KEYS.USER_PROFILES) || '[]');
    } catch {
      return [];
    }
  }

  saveUserProfiles(profiles: UserProfile[]) {
    safeStorage.setItem(KEYS.USER_PROFILES, JSON.stringify(profiles));
    this.notify();
  }

  getFeedback(): FeedbackItem[] {
    try {
      return JSON.parse(safeStorage.getItem(KEYS.FEEDBACK) || '[]');
    } catch {
      return [];
    }
  }

  saveFeedback(items: FeedbackItem[]) {
    safeStorage.setItem(KEYS.FEEDBACK, JSON.stringify(items));
    this.notify();
  }

  getAuditLogs(): AuditLog[] {
    try {
      return JSON.parse(safeStorage.getItem(KEYS.AUDIT_LOGS) || '[]');
    } catch {
      return [];
    }
  }

  saveAuditLogs(logs: AuditLog[]) {
    safeStorage.setItem(KEYS.AUDIT_LOGS, JSON.stringify(logs));
    this.notify();
  }
}

export const localDB = new LocalDatabase();

// -------------------------------------------------------------
// Storage Adapter API with Cloud Firestore Realtime Integration
// -------------------------------------------------------------

export const storageAdapter = {
  /**
   * Listen to all projects in real-time
   */
  subscribeProjects(callback: (projects: Project[]) => void): () => void {
    const emitCombined = (firestoreList?: Project[]) => {
      const deleted = getDeletedProjectIds();
      const localList = localDB.getProjects().filter(p => !deleted.has(p.id) && !deleted.has(p.publicId));

      if (!firestoreList) {
        const fallback = deleted.has(INITIAL_PROJECT.id) ? [] : [INITIAL_PROJECT];
        callback(localList.length > 0 ? localList : fallback);
        return;
      }

      const validFirestoreList = firestoreList.filter(p => !deleted.has(p.id) && !deleted.has(p.publicId));

      // Merge unique projects by id
      const map = new Map<string, Project>();
      localList.forEach(p => map.set(p.id, p));
      validFirestoreList.forEach(p => {
        const local = map.get(p.id);
        if (local && local.updatedAt && p.updatedAt && new Date(local.updatedAt) > new Date(p.updatedAt)) {
          map.set(p.id, local);
        } else {
          map.set(p.id, p);
        }
      });
      const result = Array.from(map.values()).filter(p => !deleted.has(p.id) && !deleted.has(p.publicId));
      callback(result);
    };

    // Emit initial local state immediately
    emitCombined();

    let unsubFirestore: (() => void) | null = null;
    if (isFirebaseConfigured && db) {
      ensureAnonymousAuth().catch(() => {});
      const q = query(collection(db, 'projects'), orderBy('createdAt', 'desc'));
      unsubFirestore = onSnapshot(
        q,
        snapshot => {
          const list = snapshot.docs.map(doc => doc.data() as Project);
          emitCombined(list);
        },
        error => {
          console.warn('Firestore projects subscription error, using local fallback:', error);
          emitCombined();
        }
      );
    }

    const unsubLocal = localDB.subscribe(() => {
      emitCombined();
    });

    return () => {
      if (unsubFirestore) unsubFirestore();
      unsubLocal();
    };
  },

  /**
   * Synchronously get all active projects from local store
   */
  getProjects(): Project[] {
    const deleted = getDeletedProjectIds();
    return localDB.getProjects().filter(p => !deleted.has(p.id) && !deleted.has(p.publicId));
  },

  /**
   * Synchronously get responses from local store
   */
  getResponses(projectId?: string): StimulusResponse[] {
    return localDB.getResponses(projectId);
  },

  /**
   * Synchronously get stimuli from local store
   */
  getStimuliSync(projectId?: string): Stimulus[] {
    return localDB.getStimuli(projectId);
  },

  /**
   * Get project by ID or Public ID
   */
  async getProject(idOrPublicId: string): Promise<Project | null> {
    const deleted = getDeletedProjectIds();
    if (deleted.has(idOrPublicId)) return null;

    if (isFirebaseConfigured && db) {
      try {
        await ensureAnonymousAuth();
        // Try by direct doc ID
        const directRef = doc(db, 'projects', idOrPublicId);
        const directSnap = await withTimeout(getDoc(directRef));
        if (directSnap.exists()) {
          const data = directSnap.data() as Project;
          if (!deleted.has(data.id) && !deleted.has(data.publicId)) {
            return data;
          }
        }

        // Try by publicId
        const q = query(collection(db, 'projects'), where('publicId', '==', idOrPublicId));
        const qSnap = await withTimeout(getDocs(q));
        if (!qSnap.empty) {
          const data = qSnap.docs[0].data() as Project;
          if (!deleted.has(data.id) && !deleted.has(data.publicId)) {
            return data;
          }
        }
      } catch (err) {
        console.warn('Firestore getProject error, falling back to localDB:', err);
      }
    }

    const projects = localDB.getProjects();
    const found = projects.find(p => p.id === idOrPublicId || p.publicId === idOrPublicId);
    if (found && !deleted.has(found.id) && !deleted.has(found.publicId)) return found;
    if (idOrPublicId === INITIAL_PROJECT.id || idOrPublicId === INITIAL_PROJECT.publicId) {
      return deleted.has(INITIAL_PROJECT.id) ? null : INITIAL_PROJECT;
    }
    return null;
  },

  /**
   * Create or update a project
   */
  async saveProject(project: Project): Promise<void> {
    const updatedAt = new Date().toISOString();
    const projectToSave: Project = { ...project, updatedAt };

    // 1. Update local storage immediately for zero-delay UI response
    const projects = localDB.getProjects();
    const idx = projects.findIndex(p => p.id === project.id);
    if (idx >= 0) {
      projects[idx] = projectToSave;
    } else {
      projects.unshift(projectToSave);
    }
    localDB.saveProjects(projects);

    // 2. Persist to Cloud Firestore
    if (isFirebaseConfigured && db) {
      try {
        await ensureAnonymousAuth();
        await withTimeout(setDoc(doc(db, 'projects', project.id), projectToSave, { merge: true }));
      } catch (err) {
        console.warn('Firestore saveProject error, saved locally:', err);
      }
    }
  },

  /**
   * Delete a project and its associated stimuli, responses, and sessions
   */
  async deleteProject(projectId: string): Promise<void> {
    // 1. Mark in persistent deleted registry
    markProjectAsDeleted(projectId);

    // 2. Delete locally immediately
    const projects = localDB.getProjects().filter(p => p.id !== projectId && p.publicId !== projectId);
    localDB.saveProjects(projects);

    const stimuli = localDB.getStimuli().filter(s => s.projectId !== projectId);
    localDB.saveStimuli(stimuli);

    const responses = localDB.getResponses().filter(r => r.projectId !== projectId);
    localDB.saveResponses(responses);

    const sessions = localDB.getSessions().filter(s => s.projectId !== projectId);
    localDB.saveSessions(sessions);

    // 3. Delete from Cloud Firestore
    if (isFirebaseConfigured && db) {
      try {
        await ensureAnonymousAuth();
        await withTimeout(deleteDoc(doc(db, 'projects', projectId)));

        // Clean up subcollection stimuli if any
        try {
          const stimSnap = await withTimeout(getDocs(collection(db, `projects/${projectId}/stimuli`)));
          for (const sDoc of stimSnap.docs) {
            await deleteDoc(sDoc.ref).catch(() => {});
          }
        } catch {}
      } catch (err) {
        console.warn('Firestore deleteProject error:', err);
      }
    }
  },

  /**
   * Update project status (draft, published, paused, closed, archived)
   */
  async setProjectStatus(projectId: string, status: ProjectStatus): Promise<void> {
    const updatedAt = new Date().toISOString();

    // 1. Update local storage immediately
    const projects = localDB.getProjects();
    const project = projects.find(p => p.id === projectId);
    const fullProject = project || (projectId === INITIAL_PROJECT.id ? INITIAL_PROJECT : null);
    if (project) {
      project.status = status;
      project.updatedAt = updatedAt;
      localDB.saveProjects(projects);
    }

    // 2. Persist to Cloud Firestore with setDoc merge: true so it works even if newly initialized
    if (isFirebaseConfigured && db) {
      try {
        await ensureAnonymousAuth();
        const payload = fullProject ? { ...fullProject, status, updatedAt } : { id: projectId, status, updatedAt };
        await withTimeout(setDoc(doc(db, 'projects', projectId), payload, { merge: true }));
      } catch (err) {
        console.warn('Firestore setProjectStatus error, saved locally:', err);
      }
    }
  },

  /**
   * Delete a stimulus
   */
  async deleteStimulus(stimulusId: string, projectId?: string): Promise<void> {
    const pId = projectId || INITIAL_PROJECT.id;

    // 1. Delete locally immediately
    const stimuli = localDB.getStimuli().filter(s => s.id !== stimulusId);
    localDB.saveStimuli(stimuli);

    // 2. Delete from Cloud Firestore
    if (isFirebaseConfigured && db && pId) {
      try {
        await ensureAnonymousAuth();
        await withTimeout(deleteDoc(doc(db, `projects/${pId}/stimuli`, stimulusId)));
      } catch (err) {
        console.warn('Firestore deleteStimulus error:', err);
      }
    }
  },

  /**
   * Fetch all stimuli for a project (Firestore + Local fallback)
   */
  async getStimuli(projectId: string): Promise<Stimulus[]> {
    const deleted = getDeletedProjectIds();
    const isDefaultProject =
      !projectId ||
      projectId === INITIAL_PROJECT.id ||
      projectId === INITIAL_PROJECT.publicId;

    if (deleted.has(projectId) || (isDefaultProject && deleted.has(INITIAL_PROJECT.id))) {
      return [];
    }

    const pId = isDefaultProject ? INITIAL_PROJECT.id : projectId;

    // Check localDB first
    const local = localDB.getStimuli(pId);

    // Persist/fetch from Cloud Firestore
    if (isFirebaseConfigured && db) {
      try {
        await ensureAnonymousAuth();
        let list: Stimulus[] = [];
        try {
          const q = query(collection(db, `projects/${pId}/stimuli`), orderBy('order', 'asc'));
          const snap = await withTimeout(getDocs(q));
          list = snap.docs.map(doc => doc.data() as Stimulus);
        } catch {
          // If query with orderBy fails (e.g. index issue), fall back to getDocs without order
          const colRef = collection(db, `projects/${pId}/stimuli`);
          const snap = await withTimeout(getDocs(colRef));
          list = snap.docs.map(doc => doc.data() as Stimulus);
          list.sort((a, b) => (a.order || 0) - (b.order || 0));
        }

        if (list.length > 0) {
          // Cache in localDB
          const other = localDB.getStimuli().filter(s => s.projectId !== pId);
          localDB.saveStimuli([...other, ...list]);
          return list;
        }
      } catch (err) {
        console.warn('Firestore getStimuli error, falling back to localDB:', err);
      }
    }

    if (local.length > 0) return local;
    if (isDefaultProject && !deleted.has(INITIAL_PROJECT.id)) {
      return INITIAL_STIMULI;
    }
    return [];
  },

  /**
   * Stimuli management (Real-time listener)
   */
  subscribeStimuli(projectId: string, callback: (stimuli: Stimulus[]) => void): () => void {
    const deleted = getDeletedProjectIds();
    const isDefaultProject =
      !projectId ||
      projectId === INITIAL_PROJECT.id ||
      projectId === INITIAL_PROJECT.publicId;

    if (deleted.has(projectId) || (isDefaultProject && deleted.has(INITIAL_PROJECT.id))) {
      callback([]);
      return () => {};
    }

    const pId = isDefaultProject ? INITIAL_PROJECT.id : projectId;

    const emitCombined = (firestoreList?: Stimulus[]) => {
      const localList = localDB.getStimuli(pId);
      if (!firestoreList) {
        // Only emit if we have local cached data; avoid premature empty array while Firestore is loading
        if (localList.length > 0) {
          callback(localList);
        } else if (isDefaultProject && !deleted.has(INITIAL_PROJECT.id)) {
          callback(INITIAL_STIMULI);
        }
        return;
      }

      const map = new Map<string, Stimulus>();
      localList.forEach(s => map.set(s.id, s));
      firestoreList.forEach(s => map.set(s.id, s));
      const combined = Array.from(map.values()).sort((a, b) => (a.order || 0) - (b.order || 0));
      callback(combined);
    };

    // Emit initial local state only if already cached
    emitCombined();

    let unsubFirestore: (() => void) | null = null;
    if (isFirebaseConfigured && db) {
      ensureAnonymousAuth().catch(() => {});
      const colRef = collection(db, `projects/${pId}/stimuli`);
      unsubFirestore = onSnapshot(
        colRef,
        snapshot => {
          const list = snapshot.docs.map(doc => doc.data() as Stimulus);
          list.sort((a, b) => (a.order || 0) - (b.order || 0));
          // Update local cache
          const other = localDB.getStimuli().filter(s => s.projectId !== pId);
          localDB.saveStimuli([...other, ...list]);
          emitCombined(list);
        },
        error => {
          console.warn('Firestore stimuli subscription error, fallback:', error);
          emitCombined();
        }
      );
    }

    const unsubLocal = localDB.subscribe(() => {
      emitCombined();
    });

    return () => {
      if (unsubFirestore) unsubFirestore();
      unsubLocal();
    };
  },

  async saveStimulus(stimulus: Stimulus): Promise<void> {
    const pId = stimulus.projectId || INITIAL_PROJECT.id;
    const stimToSave: Stimulus = { ...stimulus, projectId: pId };

    // 1. Update local storage immediately
    const stimuli = localDB.getStimuli();
    const idx = stimuli.findIndex(s => s.id === stimulus.id);
    if (idx >= 0) {
      stimuli[idx] = stimToSave;
    } else {
      stimuli.push(stimToSave);
    }
    localDB.saveStimuli(stimuli);

    // 2. Persist to Cloud Firestore
    if (isFirebaseConfigured && db) {
      try {
        await withTimeout(setDoc(doc(db, `projects/${pId}/stimuli`, stimulus.id), stimToSave, { merge: true }));
      } catch (err) {
        console.warn('Firestore saveStimulus error, saved locally:', err);
      }
    }
  },

  /**
   * Participant Responses (Cloud Firestore Realtime Listener)
   */
  subscribeResponses(
    projectId: string,
    stimulusId: string | undefined,
    callback: (responses: StimulusResponse[]) => void
  ): () => void {
    const pId = projectId || INITIAL_PROJECT.id;
    if (isFirebaseConfigured && db) {
      const baseCol = collection(db, `projects/${pId}/responses`);
      const q = stimulusId ? query(baseCol, where('stimulusId', '==', stimulusId)) : baseCol;
      return onSnapshot(
        q,
        snapshot => {
          const list = snapshot.docs.map(doc => {
            const data = doc.data() as any;
            return {
              ...data,
              // Convert server timestamp safely
              serverReceivedAt: data.serverReceivedAt?.toDate?.()?.toISOString() || data.completedAt,
            } as StimulusResponse;
          });
          callback(list);
        },
        error => {
          console.warn('Firestore responses subscription error (permissions or offline), using local fallback:', error);
          callback(localDB.getResponses(pId, stimulusId));
        }
      );
    }

    callback(localDB.getResponses(pId, stimulusId));
    return localDB.subscribe(() => {
      callback(localDB.getResponses(pId, stimulusId));
    });
  },

  /**
   * Submit participant response to Cloud Firestore
   */
  async submitResponse(response: StimulusResponse): Promise<{ success: boolean; message?: string }> {
    // 1. Validate project is published
    const project = await this.getProject(response.projectId);
    if (!project) return { success: false, message: 'Proyecto no encontrado' };
    if (project.status !== 'published') {
      return { success: false, message: `El proyecto no acepta respuestas (Estado: ${project.status})` };
    }

    // 2. Validate associations count
    const m = response.associations.length;
    if (m > project.settings.maxAssociations) {
      return { success: false, message: `Número de asociaciones (${m}) excede el límite permitido (${project.settings.maxAssociations})` };
    }

    // 3. Validate ranking bijection 1 to m without duplicates or gaps
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

    // 4. Ensure anonymous authentication for participant
    let authUid = 'anon';
    try {
      const user = await ensureAnonymousAuth();
      if (user) authUid = user.uid;
    } catch {
      // Continue with session anonymous ID
    }

    // 5. Prepare record with server timestamp to ensure verifiable ordering
    const responseRecord = {
      ...response,
      authUid,
      serverReceivedAt: serverTimestamp(),
    };

    // 6. Save in Cloud Firestore
    if (isFirebaseConfigured && db) {
      try {
        const respRef = doc(db, `projects/${response.projectId}/responses`, response.id);
        await withTimeout(setDoc(respRef, responseRecord));
      } catch (err: any) {
        console.error('Error al guardar en Cloud Firestore, respaldando localmente:', err);
      }
    }

    // Always maintain local cache for immediate feedback & offline resilience
    const responses = localDB.getResponses();
    const existingIdx = responses.findIndex(r => r.id === response.id);
    if (existingIdx >= 0) {
      responses[existingIdx] = response;
    } else {
      responses.push(response);
    }
    localDB.saveResponses(responses);

    // 7. Update session status
    if (isFirebaseConfigured && db) {
      try {
        const sessRef = doc(db, `projects/${response.projectId}/sessions`, response.sessionId);
        await withTimeout(updateDoc(sessRef, {
          status: 'completed',
          completedAt: new Date().toISOString(),
        }));
      } catch {
        // Doc might not exist or session already updated
      }
    }

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
   * Update an existing participant response (e.g. manual correction of an association)
   */
  async updateResponse(response: StimulusResponse): Promise<void> {
    const pId = response.projectId || INITIAL_PROJECT.id;
    if (isFirebaseConfigured && db) {
      try {
        const respRef = doc(db, `projects/${pId}/responses`, response.id);
        await withTimeout(setDoc(respRef, response, { merge: true }));
      } catch (err) {
        console.warn('Firestore updateResponse error, falling back locally:', err);
      }
    }
    const responses = localDB.getResponses();
    const idx = responses.findIndex(r => r.id === response.id);
    if (idx >= 0) {
      responses[idx] = response;
    } else {
      responses.push(response);
    }
    localDB.saveResponses(responses);
  },

  /**
   * Save a single manual word correction across all responses in a project
   * and create/update the corresponding normalization rule automatically.
   */
  async saveManualWordCorrection(
    projectId: string,
    originalWord: string,
    correctedWord: string
  ): Promise<void> {
    const pId = projectId || INITIAL_PROJECT.id;
    const normOrig = originalWord.trim().toLowerCase();
    const normCorr = correctedWord.trim().toLowerCase();

    // 1. Update all responses that contain this word
    const allResponses = localDB.getResponses(pId);
    let changed = false;

    const updatedResponses = allResponses.map(resp => {
      let respChanged = false;
      const updatedAssocs = resp.associations.map(assoc => {
        if (assoc.rawWord.trim().toLowerCase() === normOrig) {
          respChanged = true;
          if (normCorr && normCorr !== normOrig) {
            return { ...assoc, canonicalWord: normCorr };
          } else {
            const { canonicalWord, ...rest } = assoc;
            return rest;
          }
        }
        return assoc;
      });

      if (respChanged) {
        changed = true;
        const updated = { ...resp, associations: updatedAssocs };
        if (isFirebaseConfigured && db) {
          withTimeout(setDoc(doc(db, `projects/${pId}/responses`, resp.id), updated, { merge: true })).catch(() => {});
        }
        return updated;
      }
      return resp;
    });

    if (changed) {
      localDB.saveResponses(updatedResponses);
    }

    // 2. Automatically save as a normalization rule for calculation engines
    const ruleId = `rule_manual_${normOrig.replace(/[^a-z0-9]/gi, '_')}`;
    if (normCorr && normCorr !== normOrig) {
      const rule: NormalizationRule = {
        id: ruleId,
        projectId: pId,
        rawForm: normOrig,
        canonicalForm: normCorr,
        category: 'Corrección manual',
        author: 'Admin (Taller)',
        reason: 'Corrección manual directa',
        createdAt: new Date().toISOString(),
        active: true,
      };
      await this.saveRule(rule);
    } else {
      await this.deleteRule(ruleId, pId);
    }
  },

  /**
   * Toggle or set whether corrections are included in analyses for a project
   */
  async setIncludeCorrectionsInAnalysis(projectId: string, enabled: boolean): Promise<void> {
    const pId = projectId || INITIAL_PROJECT.id;
    const project = await this.getProject(pId);
    if (!project) return;

    project.settings = {
      ...project.settings,
      includeCorrectionsInAnalysis: enabled,
    };
    await this.saveProject(project);
  },

  /**
   * Sessions management
   */
  subscribeSessions(projectId: string, callback: (sessions: ParticipantSession[]) => void): () => void {
    const pId = projectId || INITIAL_PROJECT.id;
    if (isFirebaseConfigured && db) {
      const q = collection(db, `projects/${pId}/sessions`);
      return onSnapshot(
        q,
        snapshot => {
          const list = snapshot.docs.map(doc => doc.data() as ParticipantSession);
          callback(list);
        },
        error => {
          console.warn('Firestore sessions subscription error, fallback:', error);
          callback(localDB.getSessions(pId));
        }
      );
    }

    callback(localDB.getSessions(pId));
    return localDB.subscribe(() => {
      callback(localDB.getSessions(pId));
    });
  },

  async createSession(session: ParticipantSession): Promise<void> {
    const pId = session.projectId || INITIAL_PROJECT.id;
    let authUid = session.anonymousId;
    try {
      const user = await ensureAnonymousAuth();
      if (user) authUid = user.uid;
    } catch {
      // Continue with session anonymousId
    }

    const sessionToSave = {
      ...session,
      projectId: pId,
      authUid,
    };

    if (isFirebaseConfigured && db) {
      try {
        await withTimeout(setDoc(doc(db, `projects/${pId}/sessions`, session.id), sessionToSave));
      } catch (err) {
        console.warn('Firestore createSession error, saving locally:', err);
      }
    }

    const sessions = localDB.getSessions();
    sessions.push(sessionToSave);
    localDB.saveSessions(sessions);
  },

  async updateSessionFlags(
    sessionId: string,
    flags: Partial<ParticipantSession['flags']>,
    projectId?: string
  ): Promise<void> {
    const sessions = localDB.getSessions();
    const session = sessions.find(s => s.id === sessionId);
    const pId = projectId || session?.projectId || INITIAL_PROJECT.id;

    if (isFirebaseConfigured && db && pId) {
      try {
        await ensureAnonymousAuth();
        const updatePayload: Record<string, any> = {};
        if (flags.excludedByAdmin !== undefined) {
          updatePayload['flags.excludedByAdmin'] = flags.excludedByAdmin;
        }
        if (flags.exclusionReason !== undefined) {
          updatePayload['flags.exclusionReason'] = flags.exclusionReason || '';
        }
        if (flags.suspiciousTiming !== undefined) {
          updatePayload['flags.suspiciousTiming'] = flags.suspiciousTiming;
        }
        if (flags.visibilityLossCount !== undefined) {
          updatePayload['flags.visibilityLossCount'] = flags.visibilityLossCount;
        }

        if (Object.keys(updatePayload).length > 0) {
          await withTimeout(updateDoc(doc(db, `projects/${pId}/sessions`, sessionId), updatePayload));
        }
      } catch (err) {
        console.warn('Firestore updateSessionFlags error:', err);
      }
    }

    if (session) {
      session.flags = { ...session.flags, ...flags };
      if (!flags.exclusionReason) {
        delete session.flags.exclusionReason;
      }
      localDB.saveSessions(sessions);
    } else {
      localDB.saveSessions(sessions);
    }
  },

  /**
   * Explicitly complete a participant session with timestamp and total duration
   */
  async completeSession(
    sessionId: string,
    data: {
      projectId?: string;
      completedAt?: string;
      totalDurationMs?: number;
    }
  ): Promise<void> {
    const completedAt = data.completedAt || new Date().toISOString();
    const updatePayload: Record<string, any> = {
      status: 'completed',
      completedAt,
    };
    if (data.totalDurationMs !== undefined && data.totalDurationMs > 0) {
      updatePayload.totalDurationMs = data.totalDurationMs;
    }

    // 1. Update in Firestore
    const pId = data.projectId || INITIAL_PROJECT.id;
    if (isFirebaseConfigured && db && pId) {
      try {
        await ensureAnonymousAuth();
        const sessRef = doc(db, `projects/${pId}/sessions`, sessionId);
        await withTimeout(updateDoc(sessRef, updatePayload));
      } catch (err) {
        console.warn('Firestore completeSession error, saving locally:', err);
      }
    }

    // 2. Update locally
    const sessions = localDB.getSessions();
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
      session.status = 'completed';
      session.completedAt = completedAt;
      if (data.totalDurationMs !== undefined && data.totalDurationMs > 0) {
        session.totalDurationMs = data.totalDurationMs;
      }
      localDB.saveSessions(sessions);
    }
  },

  /**
   * Reconcile participant sessions: auto-heals any session that has responses saved
   * but whose status was left as 'started' or 'in_progress', updating both Firestore and localDB.
   */
  async reconcileSessions(projectId: string): Promise<number> {
    const pId = projectId || INITIAL_PROJECT.id;
    let healedCount = 0;

    try {
      let allSessions: ParticipantSession[] = [];
      let allResponses: StimulusResponse[] = [];

      if (isFirebaseConfigured && db && pId) {
        try {
          await ensureAnonymousAuth();
          const [sessSnap, respSnap] = await Promise.all([
            withTimeout(getDocs(collection(db, `projects/${pId}/sessions`))),
            withTimeout(getDocs(collection(db, `projects/${pId}/responses`))),
          ]);
          allSessions = sessSnap.docs.map(d => ({ ...(d.data() as ParticipantSession), id: d.id }));
          allResponses = respSnap.docs.map(d => ({ ...(d.data() as StimulusResponse), id: d.id }));
        } catch {
          allSessions = localDB.getSessions().filter(s => s.projectId === pId);
          allResponses = localDB.getResponses().filter(r => r.projectId === pId);
        }
      } else {
        allSessions = localDB.getSessions().filter(s => s.projectId === pId);
        allResponses = localDB.getResponses().filter(r => r.projectId === pId);
      }

      // Group responses by sessionId
      const responsesBySession = new Map<string, StimulusResponse[]>();
      allResponses.forEach(r => {
        if (!r.sessionId) return;
        const list = responsesBySession.get(r.sessionId) || [];
        list.push(r);
        responsesBySession.set(r.sessionId, list);
      });

      for (const s of allSessions) {
        const sResps = responsesBySession.get(s.id) || [];
        const validResps = sResps.filter(r => (r.associations?.length || 0) > 0);

        // If session has valid responses but is not marked completed or missing completedAt
        if (validResps.length > 0 && (s.status !== 'completed' || !s.completedAt)) {
          const latestRespTime = Math.max(
            ...validResps.map(r => new Date(r.completedAt || 0).getTime()).filter(t => !isNaN(t) && t > 0)
          );
          const computedCompletedAt = latestRespTime > 0
            ? new Date(latestRespTime).toISOString()
            : s.completedAt || new Date().toISOString();

          let computedDuration = s.totalDurationMs;
          if (!computedDuration && s.startedAt) {
            computedDuration = Math.max(1000, new Date(computedCompletedAt).getTime() - new Date(s.startedAt).getTime());
          }

          await this.completeSession(s.id, {
            projectId: pId,
            completedAt: computedCompletedAt,
            totalDurationMs: computedDuration,
          });
          healedCount++;
        }
      }
    } catch (err) {
      console.warn('Reconcile sessions error:', err);
    }

    return healedCount;
  },

  /**
   * Delete a participant session and all its associated responses permanently
   */
  async deleteSession(sessionId: string, projectId: string): Promise<void> {
    const pId = projectId || INITIAL_PROJECT.id;

    // 1. Delete from Firestore if configured
    if (isFirebaseConfigured && db && pId) {
      try {
        await ensureAnonymousAuth();
        // Delete the session document
        await withTimeout(deleteDoc(doc(db, `projects/${pId}/sessions`, sessionId))).catch(err => {
          console.warn('Firestore deleteSession doc error:', err);
        });

        // Delete all associated response documents
        try {
          const respQ = query(collection(db, `projects/${pId}/responses`), where('sessionId', '==', sessionId));
          const respSnap = await withTimeout(getDocs(respQ));
          for (const rDoc of respSnap.docs) {
            await deleteDoc(rDoc.ref).catch(() => {});
          }
        } catch (respErr) {
          console.warn('Firestore delete responses for session error:', respErr);
        }
      } catch (err) {
        console.warn('Firestore deleteSession error:', err);
      }
    }

    // 2. Delete from local database
    const sessions = localDB.getSessions().filter(s => s.id !== sessionId);
    localDB.saveSessions(sessions);

    const responses = localDB.getResponses().filter(r => r.sessionId !== sessionId);
    localDB.saveResponses(responses);
  },

  /**
   * Delete all empty participant sessions (0 completed associations) in a project
   */
  async deleteEmptySessions(projectId: string): Promise<number> {
    const pId = projectId || INITIAL_PROJECT.id;
    const deletedSessionIds = new Set<string>();

    // 1. Check Firestore if configured
    if (isFirebaseConfigured && db && pId) {
      try {
        await ensureAnonymousAuth();
        const sessSnap = await withTimeout(getDocs(collection(db, `projects/${pId}/sessions`)));
        const respSnap = await withTimeout(getDocs(collection(db, `projects/${pId}/responses`)));

        // Set of session IDs that have valid responses with associations
        const sessionIdsWithAssocs = new Set<string>();
        respSnap.docs.forEach(d => {
          const r = d.data() as StimulusResponse;
          if (r.sessionId && Array.isArray(r.associations) && r.associations.length > 0) {
            sessionIdsWithAssocs.add(r.sessionId);
          }
        });

        for (const sDoc of sessSnap.docs) {
          const s = sDoc.data() as ParticipantSession;
          if (!sessionIdsWithAssocs.has(s.id)) {
            deletedSessionIds.add(s.id);
            await deleteDoc(sDoc.ref).catch(() => {});
            // Also clean up any empty response docs for this session
            try {
              const qEmpty = query(collection(db, `projects/${pId}/responses`), where('sessionId', '==', s.id));
              const snapEmpty = await withTimeout(getDocs(qEmpty));
              for (const rDoc of snapEmpty.docs) {
                await deleteDoc(rDoc.ref).catch(() => {});
              }
            } catch {}
          }
        }
      } catch (err) {
        console.warn('Firestore deleteEmptySessions error:', err);
      }
    }

    // 2. Clean up local database
    const allLocalSessions = localDB.getSessions();
    const allLocalResponses = localDB.getResponses();

    const localSessionIdsWithAssocs = new Set<string>();
    allLocalResponses.forEach(r => {
      if (r.projectId === pId && r.sessionId && Array.isArray(r.associations) && r.associations.length > 0) {
        localSessionIdsWithAssocs.add(r.sessionId);
      }
    });

    const projectSessions = allLocalSessions.filter(s => s.projectId === pId);
    projectSessions.forEach(s => {
      if (!localSessionIdsWithAssocs.has(s.id)) {
        deletedSessionIds.add(s.id);
      }
    });

    const remainingSessions = allLocalSessions.filter(s => !deletedSessionIds.has(s.id));
    localDB.saveSessions(remainingSessions);

    const remainingResponses = allLocalResponses.filter(r => !deletedSessionIds.has(r.sessionId));
    localDB.saveResponses(remainingResponses);

    return deletedSessionIds.size;
  },

  /**
   * Normalization Rules
   */
  subscribeRules(projectId: string, callback: (rules: NormalizationRule[]) => void): () => void {
    const pId = projectId || INITIAL_PROJECT.id;
    if (isFirebaseConfigured && db) {
      const q = collection(db, `projects/${pId}/rules`);
      return onSnapshot(
        q,
        snapshot => {
          const list = snapshot.docs.map(doc => doc.data() as NormalizationRule);
          callback(list);
        },
        error => {
          console.warn('Firestore rules subscription error, fallback:', error);
          callback(localDB.getRules(pId));
        }
      );
    }

    callback(localDB.getRules(pId));
    return localDB.subscribe(() => {
      callback(localDB.getRules(pId));
    });
  },

  async saveRule(rule: NormalizationRule): Promise<void> {
    const pId = rule.projectId || INITIAL_PROJECT.id;
    if (isFirebaseConfigured && db) {
      try {
        await withTimeout(setDoc(doc(db, `projects/${pId}/rules`, rule.id), { ...rule, projectId: pId }, { merge: true }));
        return;
      } catch (err) {
        console.warn('Firestore saveRule error, saving locally:', err);
      }
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

  async deleteRule(ruleId: string, projectId?: string): Promise<void> {
    const pId = projectId || INITIAL_PROJECT.id;
    if (isFirebaseConfigured && db && pId) {
      try {
        await deleteDoc(doc(db, `projects/${pId}/rules`, ruleId));
      } catch (err) {
        console.warn('Firestore deleteRule error:', err);
      }
    }
    const rules = localDB.getRules().filter(r => r.id !== ruleId);
    localDB.saveRules(rules);
  },

  /**
   * Semantic Interpretation persistence (Firebase Cloud Firestore + Local Cache)
   */
  async saveInterpretation(projectId: string, interpretation: SemanticInterpretationData): Promise<void> {
    const pId = projectId || INITIAL_PROJECT.id;
    if (isFirebaseConfigured && db && pId) {
      try {
        await ensureAnonymousAuth();
        await withTimeout(
          setDoc(doc(db, `projects/${pId}/interpretations`, 'current'), interpretation)
        );
      } catch (err) {
        console.warn('Firestore saveInterpretation error, saving locally:', err);
      }
    }
    localDB.saveInterpretation(pId, interpretation);
  },

  async getInterpretation(projectId: string): Promise<SemanticInterpretationData | null> {
    const pId = projectId || INITIAL_PROJECT.id;
    if (isFirebaseConfigured && db && pId) {
      try {
        await ensureAnonymousAuth();
        const snap = await withTimeout(getDoc(doc(db, `projects/${pId}/interpretations`, 'current')));
        if (snap.exists()) {
          return snap.data() as SemanticInterpretationData;
        }
      } catch (err) {
        console.warn('Firestore getInterpretation error, falling back locally:', err);
      }
    }
    return localDB.getInterpretation(pId);
  },

  subscribeInterpretation(
    projectId: string,
    callback: (interp: SemanticInterpretationData | null) => void
  ): () => void {
    const pId = projectId || INITIAL_PROJECT.id;
    if (isFirebaseConfigured && db && pId) {
      const docRef = doc(db, `projects/${pId}/interpretations`, 'current');
      return onSnapshot(
        docRef,
        snap => {
          if (snap.exists()) {
            callback(snap.data() as SemanticInterpretationData);
          } else {
            callback(localDB.getInterpretation(pId));
          }
        },
        err => {
          console.warn('Firestore interpretation subscription error, fallback:', err);
          callback(localDB.getInterpretation(pId));
        }
      );
    }
    callback(localDB.getInterpretation(pId));
    return localDB.subscribe(() => {
      callback(localDB.getInterpretation(pId));
    });
  },

  // -----------------------------------------------------------
  // USER PROFILES & USER PROJECTS
  // -----------------------------------------------------------

  async getUserProfile(uid: string): Promise<UserProfile | null> {
    if (!uid) return null;
    if (isFirebaseConfigured && db) {
      try {
        const snap = await withTimeout(getDoc(doc(db, 'userProfiles', uid)));
        if (snap.exists()) {
          return snap.data() as UserProfile;
        }
      } catch (err) {
        console.warn('Firestore getUserProfile error, checking locally:', err);
      }
    }
    const profiles = localDB.getUserProfiles();
    return profiles.find(p => p.uid === uid) || null;
  },

  async saveUserProfile(profile: UserProfile): Promise<void> {
    const updatedAt = new Date().toISOString();
    const finalProfile: UserProfile = { ...profile, lastLoginAt: updatedAt };

    // 1. Save locally
    const profiles = localDB.getUserProfiles();
    const idx = profiles.findIndex(p => p.uid === profile.uid);
    if (idx >= 0) {
      profiles[idx] = finalProfile;
    } else {
      profiles.push(finalProfile);
    }
    localDB.saveUserProfiles(profiles);

    // 2. Persist to Firestore
    if (isFirebaseConfigured && db) {
      try {
        await withTimeout(setDoc(doc(db, 'userProfiles', profile.uid), finalProfile, { merge: true }));
      } catch (err) {
        console.warn('Firestore saveUserProfile error, saved locally:', err);
      }
    }
  },

  async getAllUserProfiles(): Promise<UserProfile[]> {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await withTimeout(getDocs(collection(db, 'userProfiles')));
        if (!snap.empty) {
          const list = snap.docs.map(d => d.data() as UserProfile);
          // Merge with local profiles
          const localList = localDB.getUserProfiles();
          const map = new Map<string, UserProfile>();
          localList.forEach(p => map.set(p.uid, p));
          list.forEach(p => map.set(p.uid, p));
          return Array.from(map.values());
        }
      } catch (err) {
        console.warn('Firestore getAllUserProfiles error, returning local:', err);
      }
    }
    return localDB.getUserProfiles();
  },

  async updateUserStatus(uid: string, status: UserStatus): Promise<void> {
    const profiles = localDB.getUserProfiles();
    const found = profiles.find(p => p.uid === uid);
    if (found) {
      found.status = status;
      localDB.saveUserProfiles(profiles);
    }

    if (isFirebaseConfigured && db) {
      try {
        await withTimeout(updateDoc(doc(db, 'userProfiles', uid), { status }));
      } catch (err) {
        console.warn('Firestore updateUserStatus error:', err);
      }
    }
  },

  subscribeUserProjects(uid: string, callback: (projects: Project[]) => void): () => void {
    const filterUserProjects = (all: Project[]) => {
      const deleted = getDeletedProjectIds();
      return all.filter(p => !deleted.has(p.id) && !deleted.has(p.publicId) && p.ownerUid === uid);
    };

    const emitUserProjects = (firestoreList?: Project[]) => {
      const deleted = getDeletedProjectIds();
      const localList = localDB.getProjects().filter(p => !deleted.has(p.id) && !deleted.has(p.publicId));

      let merged: Project[] = [];
      if (!firestoreList) {
        merged = localList;
      } else {
        const validFirestoreList = firestoreList.filter(p => !deleted.has(p.id) && !deleted.has(p.publicId));
        const map = new Map<string, Project>();
        localList.forEach(p => map.set(p.id, p));
        validFirestoreList.forEach(p => map.set(p.id, p));
        merged = Array.from(map.values());
      }
      callback(filterUserProjects(merged));
    };

    emitUserProjects();

    let unsubFirestore: (() => void) | null = null;
    if (isFirebaseConfigured && db && uid) {
      try {
        const q = query(collection(db, 'projects'), where('ownerUid', '==', uid));
        unsubFirestore = onSnapshot(
          q,
          snapshot => {
            const list = snapshot.docs.map(doc => doc.data() as Project);
            emitUserProjects(list);
          },
          err => {
            console.warn('Firestore user projects subscription error:', err);
            emitUserProjects();
          }
        );
      } catch {
        emitUserProjects();
      }
    }

    const unsubLocal = localDB.subscribe(() => {
      emitUserProjects();
    });

    return () => {
      if (unsubFirestore) unsubFirestore();
      unsubLocal();
    };
  },

  // -----------------------------------------------------------
  // FEEDBACK & SUPPORT TICKETS
  // -----------------------------------------------------------

  async submitFeedback(
    item: Omit<FeedbackItem, 'id' | 'createdAt' | 'updatedAt' | 'status'>
  ): Promise<FeedbackItem> {
    const id = `fb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newFeedback: FeedbackItem = {
      ...item,
      id,
      status: 'recibido',
      createdAt: now,
      updatedAt: now,
    };

    // 1. Save locally
    const items = localDB.getFeedback();
    items.unshift(newFeedback);
    localDB.saveFeedback(items);

    // 2. Persist to Firestore
    if (isFirebaseConfigured && db) {
      try {
        await withTimeout(setDoc(doc(db, 'feedback', id), newFeedback));
      } catch (err) {
        console.warn('Firestore submitFeedback error, saved locally:', err);
      }
    }

    return newFeedback;
  },

  async getUserFeedback(uid: string): Promise<FeedbackItem[]> {
    if (isFirebaseConfigured && db && uid) {
      try {
        const q = query(collection(db, 'feedback'), where('uid', '==', uid));
        const snap = await withTimeout(getDocs(q));
        if (!snap.empty) {
          return snap.docs.map(d => d.data() as FeedbackItem);
        }
      } catch (err) {
        console.warn('Firestore getUserFeedback error, fallback local:', err);
      }
    }
    return localDB.getFeedback().filter(f => f.uid === uid);
  },

  async getAllFeedback(): Promise<FeedbackItem[]> {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await withTimeout(getDocs(collection(db, 'feedback')));
        if (!snap.empty) {
          const list = snap.docs.map(d => d.data() as FeedbackItem);
          const localList = localDB.getFeedback();
          const map = new Map<string, FeedbackItem>();
          localList.forEach(f => map.set(f.id, f));
          list.forEach(f => map.set(f.id, f));
          return Array.from(map.values()).sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
        }
      } catch (err) {
        console.warn('Firestore getAllFeedback error, fallback local:', err);
      }
    }
    return localDB.getFeedback();
  },

  async updateFeedbackStatus(
    id: string,
    status: FeedbackStatus,
    adminResponse?: string,
    internalNotes?: string
  ): Promise<void> {
    const updatedAt = new Date().toISOString();
    const items = localDB.getFeedback();
    const found = items.find(f => f.id === id);
    if (found) {
      found.status = status;
      found.updatedAt = updatedAt;
      if (adminResponse !== undefined) {
        found.adminResponse = adminResponse;
        found.adminResponseAt = updatedAt;
      }
      if (internalNotes !== undefined) found.internalNotes = internalNotes;
      localDB.saveFeedback(items);
    }

    if (isFirebaseConfigured && db) {
      try {
        const payload: Record<string, any> = { status, updatedAt };
        if (adminResponse !== undefined) {
          payload.adminResponse = adminResponse;
          payload.adminResponseAt = updatedAt;
        }
        if (internalNotes !== undefined) payload.internalNotes = internalNotes;
        await withTimeout(updateDoc(doc(db, 'feedback', id), payload));
      } catch (err) {
        console.warn('Firestore updateFeedbackStatus error:', err);
      }
    }
  },

  // -----------------------------------------------------------
  // AUDIT LOGS & SYSTEM STATS
  // -----------------------------------------------------------

  async logAdminAction(action: Omit<AuditLog, 'id' | 'timestamp'>): Promise<void> {
    const id = `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newLog: AuditLog = {
      ...action,
      id,
      timestamp: new Date().toISOString(),
    };

    const logs = localDB.getAuditLogs();
    logs.unshift(newLog);
    localDB.saveAuditLogs(logs.slice(0, 500)); // Keep last 500 locally

    if (isFirebaseConfigured && db) {
      try {
        await withTimeout(setDoc(doc(db, 'auditLogs', id), newLog));
      } catch (err) {
        console.warn('Firestore logAdminAction error:', err);
      }
    }
  },

  async getAuditLogs(limitCount = 100): Promise<AuditLog[]> {
    if (isFirebaseConfigured && db) {
      try {
        const snap = await withTimeout(getDocs(collection(db, 'auditLogs')));
        if (!snap.empty) {
          return snap.docs
            .map(d => d.data() as AuditLog)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
            .slice(0, limitCount);
        }
      } catch (err) {
        console.warn('Firestore getAuditLogs error, local fallback:', err);
      }
    }
    return localDB.getAuditLogs().slice(0, limitCount);
  },

  async getSystemStats(): Promise<SystemStats> {
    const allUsers = await this.getAllUserProfiles();
    const allProjects = localDB.getProjects();
    const allFeedback = await this.getAllFeedback();
    const allResponses = localDB.getResponses();

    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentRegs = allUsers.filter(u => new Date(u.createdAt).getTime() >= sevenDaysAgo).length;
    const activeU = allUsers.filter(u => new Date(u.lastLoginAt || 0).getTime() >= sevenDaysAgo).length;
    const pendingF = allFeedback.filter(f => f.status === 'recibido' || f.status === 'en_revision').length;

    return {
      totalUsers: allUsers.length,
      recentRegistrations: recentRegs,
      activeUsers: Math.max(activeU, allUsers.length > 0 ? 1 : 0),
      totalProjects: allProjects.length,
      totalStimuli: localDB.getStimuli().length,
      totalResponses: allResponses.length,
      pendingFeedback: pendingF,
      lastCalculatedAt: new Date().toISOString(),
    };
  },
};

/**
 * Evaluates the real-time completion state of a participant session based on empirical data
 */
export function evaluateSessionStatus(
  session: ParticipantSession,
  sessionResponses: StimulusResponse[],
  totalStimuliCount: number
): {
  isCompleted: boolean;
  isPartial: boolean;
  isEmpty: boolean;
  answeredCount: number;
  totalAssocs: number;
  completedAt?: string;
  durationSeconds?: number;
} {
  const validResponses = sessionResponses.filter(r => (r.associations?.length || 0) > 0);
  const totalAssocs = validResponses.reduce((acc, r) => acc + (r.associations?.length || 0), 0);
  const answeredStimuliIds = new Set(validResponses.map(r => r.stimulusId));
  const answeredCount = answeredStimuliIds.size > 0 ? answeredStimuliIds.size : validResponses.length;

  const isEmpty = validResponses.length === 0;

  // A session is completed if:
  // 1. It explicitly has status 'completed' and is not empty, OR
  // 2. It answered all configured stimuli (answeredCount >= totalStimuliCount and totalStimuliCount > 0), OR
  // 3. totalStimuliCount <= 1 and answeredCount >= 1
  const isCompleted = !isEmpty && (
    session.status === 'completed' ||
    (totalStimuliCount > 0 && answeredCount >= totalStimuliCount) ||
    (totalStimuliCount <= 1 && answeredCount >= 1)
  );

  const isPartial = !isEmpty && !isCompleted && answeredCount > 0;

  // Derive completedAt
  let completedAt = session.completedAt;
  if (!completedAt && validResponses.length > 0) {
    const validTimes = validResponses
      .map(r => new Date(r.completedAt || 0).getTime())
      .filter(t => !isNaN(t) && t > 0);
    if (validTimes.length > 0) {
      completedAt = new Date(Math.max(...validTimes)).toISOString();
    }
  }

  // Derive durationSeconds
  let durationSeconds = session.totalDurationMs && session.totalDurationMs > 0
    ? Math.round(session.totalDurationMs / 1000)
    : undefined;

  if (!durationSeconds && session.startedAt && completedAt) {
    const diff = new Date(completedAt).getTime() - new Date(session.startedAt).getTime();
    if (diff > 0) {
      durationSeconds = Math.round(diff / 1000);
    }
  }

  if (!durationSeconds && validResponses.length > 0) {
    const sumMs = validResponses.reduce(
      (acc, r) => acc + (r.totalGenerationTimeMs || 0) + (r.rankingTimeMs || 0),
      0
    );
    if (sumMs > 0) {
      durationSeconds = Math.round(sumMs / 1000);
    }
  }

  return {
    isCompleted,
    isPartial,
    isEmpty,
    answeredCount,
    totalAssocs,
    completedAt,
    durationSeconds,
  };
}
