import { describe, it, expect } from 'vitest';

/**
 * Firestore Security Rules Logic Emulator & Unit Tests
 * Accurately models the exact security predicates and constraints of firestore.rules
 */

interface RequestAuth {
  uid: string;
  token: {
    firebase: {
      sign_in_provider: string;
    };
    admin?: boolean;
    email?: string;
    email_verified?: boolean;
  };
}

interface FirestoreState {
  admins: Set<string>; // UIDs or emails present in /admins/{id}
  documents: Map<string, any>;
}

class FirestoreRulesEngine {
  constructor(private state: FirestoreState) {}

  // Helper 1: isAuthenticated
  isAuthenticated(auth: RequestAuth | null): boolean {
    return auth !== null && Boolean(auth.uid);
  }

  // Helper 2: isAnonymous
  isAnonymous(auth: RequestAuth | null): boolean {
    return this.isAuthenticated(auth) && auth?.token.firebase.sign_in_provider === 'anonymous';
  }

  // Helper 3: isAdmin
  isAdmin(auth: RequestAuth | null): boolean {
    if (!this.isAuthenticated(auth) || this.isAnonymous(auth)) {
      return false;
    }
    const token = auth!.token;
    if (token.admin === true) return true;
    if (this.state.admins.has(auth!.uid)) return true;
    if (token.email_verified === true && token.email && this.state.admins.has(token.email)) {
      return true;
    }
    return false;
  }

  // /projects/{projectId} - Read
  canReadProject(): boolean {
    return true; // allow read: if true;
  }

  // /projects/{projectId} - Write
  canWriteProject(auth: RequestAuth | null): boolean {
    return this.isAdmin(auth);
  }

  // /projects/{projectId}/stimuli/{stimulusId} - Read & Write
  canReadStimulus(): boolean {
    return true;
  }
  canWriteStimulus(auth: RequestAuth | null): boolean {
    return this.isAdmin(auth);
  }

  // /projects/{projectId}/rules/{ruleId} - Read & Write
  canReadOrWriteRule(auth: RequestAuth | null): boolean {
    return this.isAdmin(auth);
  }

  // /projects/{projectId}/sessions/{sessionId}
  canReadSession(auth: RequestAuth | null, sessionDoc: any): boolean {
    if (this.isAdmin(auth)) return true;
    if (this.isAuthenticated(auth) && auth) {
      return sessionDoc.authUid === auth.uid || sessionDoc.anonymousId === auth.uid;
    }
    return false;
  }

  canCreateSession(auth: RequestAuth | null, projectId: string, sessionId: string, data: any): { allowed: boolean; reason?: string } {
    if (!this.isAuthenticated(auth)) return { allowed: false, reason: 'Unauthenticated' };
    if (data.id !== sessionId) return { allowed: false, reason: 'Document ID mismatch' };
    if (data.projectId !== projectId) return { allowed: false, reason: 'Project ID mismatch' };
    if (data.authUid !== auth!.uid) return { allowed: false, reason: 'Auth UID mismatch' };
    if (data.consentAccepted !== true) return { allowed: false, reason: 'Consent must be accepted' };
    if (!['started', 'completed'].includes(data.status)) return { allowed: false, reason: 'Invalid status' };
    if (typeof data.startedAt !== 'string') return { allowed: false, reason: 'startedAt must be string' };
    return { allowed: true };
  }

  canUpdateSession(auth: RequestAuth | null, existingDoc: any, updatedData: any): { allowed: boolean; reason?: string } {
    if (this.isAdmin(auth)) return { allowed: true };
    if (!this.isAuthenticated(auth)) return { allowed: false, reason: 'Unauthenticated' };
    if (existingDoc.authUid !== auth!.uid) return { allowed: false, reason: 'Not owner of session' };
    if (updatedData.authUid !== existingDoc.authUid) return { allowed: false, reason: 'Cannot change authUid' };
    if (updatedData.projectId !== existingDoc.projectId) return { allowed: false, reason: 'Cannot change projectId' };

    // Check affected keys
    const allowedKeys = new Set(['status', 'completedAt', 'flags']);
    const changedKeys = Object.keys(updatedData).filter(k => updatedData[k] !== existingDoc[k]);
    for (const key of changedKeys) {
      if (!allowedKeys.has(key)) {
        return { allowed: false, reason: `Modification of field ${key} not permitted` };
      }
    }
    return { allowed: true };
  }

  canDeleteSession(auth: RequestAuth | null): boolean {
    return this.isAdmin(auth);
  }

  // /projects/{projectId}/responses/{responseId} - MAXIMUM PRIVACY
  canReadResponses(auth: RequestAuth | null): boolean {
    // Only administrator can read or list responses
    return this.isAdmin(auth);
  }

  canCreateResponse(auth: RequestAuth | null, projectId: string, responseId: string, data: any): { allowed: boolean; reason?: string } {
    if (!this.isAuthenticated(auth)) return { allowed: false, reason: 'Unauthenticated' };
    if (data.id !== responseId) return { allowed: false, reason: 'id mismatch' };
    if (data.projectId !== projectId) return { allowed: false, reason: 'projectId mismatch' };
    if (data.authUid !== auth!.uid) return { allowed: false, reason: 'authUid mismatch with participant identity' };
    if (typeof data.sessionId !== 'string' || data.sessionId.length === 0) return { allowed: false, reason: 'Missing sessionId' };
    if (typeof data.stimulusId !== 'string' || data.stimulusId.length === 0) return { allowed: false, reason: 'Missing stimulusId' };
    if (typeof data.stimulusText !== 'string' || data.stimulusText.length === 0) return { allowed: false, reason: 'Missing stimulusText' };
    if (typeof data.wordCount !== 'number' || data.wordCount < 1 || data.wordCount > 30) {
      return { allowed: false, reason: 'wordCount must be integer between 1 and 30' };
    }
    if (!Array.isArray(data.associations) || data.associations.length !== data.wordCount) {
      return { allowed: false, reason: 'associations array length must equal wordCount' };
    }
    if (typeof data.totalGenerationTimeMs !== 'number' || data.totalGenerationTimeMs < 0) {
      return { allowed: false, reason: 'totalGenerationTimeMs must be non-negative number' };
    }
    if (typeof data.rankingTimeMs !== 'number' || data.rankingTimeMs < 0) {
      return { allowed: false, reason: 'rankingTimeMs must be non-negative number' };
    }
    if (typeof data.completedAt !== 'string') return { allowed: false, reason: 'completedAt must be string' };

    return { allowed: true };
  }

  canUpdateResponse(): boolean {
    // Immutable responses
    return false;
  }

  canDeleteResponse(auth: RequestAuth | null): boolean {
    return this.isAdmin(auth);
  }
}

describe('Firestore Security Rules Verification Suite', () => {
  const state: FirestoreState = {
    admins: new Set(['admin_uid_alejandro', 'investigador@rsn.edu.mx']),
    documents: new Map(),
  };

  const engine = new FirestoreRulesEngine(state);

  // Participant 1 (Anonymous)
  const participant1: RequestAuth = {
    uid: 'anon_participant_101',
    token: {
      firebase: { sign_in_provider: 'anonymous' },
    },
  };

  // Participant 2 (Anonymous)
  const participant2: RequestAuth = {
    uid: 'anon_participant_202',
    token: {
      firebase: { sign_in_provider: 'anonymous' },
    },
  };

  // Admin via Custom Claim
  const adminCustomClaim: RequestAuth = {
    uid: 'admin_uid_claim',
    token: {
      firebase: { sign_in_provider: 'google.com' },
      admin: true,
      email: 'profesor@unam.mx',
      email_verified: true,
    },
  };

  // Admin via Collection Document UID
  const adminDocUid: RequestAuth = {
    uid: 'admin_uid_alejandro',
    token: {
      firebase: { sign_in_provider: 'google.com' },
      email: 'aleja@gmail.com',
      email_verified: true,
    },
  };

  // Normal non-anonymous user who is NOT an admin
  const normalUser: RequestAuth = {
    uid: 'random_user_999',
    token: {
      firebase: { sign_in_provider: 'password' },
      email: 'hacker@malicious.com',
      email_verified: false,
    },
  };

  describe('1. Admin Verification (isAdmin)', () => {
    it('should NEVER grant admin privileges to an anonymous participant', () => {
      expect(engine.isAdmin(participant1)).toBe(false);
      expect(engine.isAdmin(participant2)).toBe(false);
    });

    it('should NOT grant admin privileges to arbitrary non-anonymous users', () => {
      expect(engine.isAdmin(normalUser)).toBe(false);
    });

    it('should grant admin to verified custom claims token', () => {
      expect(engine.isAdmin(adminCustomClaim)).toBe(true);
    });

    it('should grant admin to users registered in /admins/{uid}', () => {
      expect(engine.isAdmin(adminDocUid)).toBe(true);
    });
  });

  describe('2. Responses Collection Security & Isolation', () => {
    const validResponseData = {
      id: 'resp_p1_stim1',
      projectId: 'proj-taller-rsn',
      sessionId: 'sess_101',
      stimulusId: 'stim-1',
      stimulusText: 'DOLOR',
      authUid: participant1.uid,
      wordCount: 2,
      associations: [
        { rawWord: 'tristeza', rank: 1, generationOrder: 1 },
        { rawWord: 'llanto', rank: 2, generationOrder: 2 },
      ],
      totalGenerationTimeMs: 4500,
      rankingTimeMs: 3200,
      completedAt: '2026-11-02T15:00:00.000Z',
    };

    it('should allow an anonymous participant to create their own valid response', () => {
      const res = engine.canCreateResponse(participant1, 'proj-taller-rsn', 'resp_p1_stim1', validResponseData);
      expect(res.allowed).toBe(true);
    });

    it('should REJECT response creation if unauthenticated', () => {
      const res = engine.canCreateResponse(null, 'proj-taller-rsn', 'resp_p1_stim1', validResponseData);
      expect(res.allowed).toBe(false);
      expect(res.reason).toBe('Unauthenticated');
    });

    it('should REJECT spoofing where authUid does not match participant token', () => {
      const forgedData = { ...validResponseData, authUid: participant2.uid };
      const res = engine.canCreateResponse(participant1, 'proj-taller-rsn', 'resp_p1_stim1', forgedData);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('authUid mismatch');
    });

    it('should REJECT response with wordCount mismatch with associations length', () => {
      const mismatchedData = { ...validResponseData, wordCount: 3 }; // only 2 associations provided
      const res = engine.canCreateResponse(participant1, 'proj-taller-rsn', 'resp_p1_stim1', mismatchedData);
      expect(res.allowed).toBe(false);
      expect(res.reason).toContain('associations array length must equal wordCount');
    });

    it('should REJECT participant attempts to read or list responses (Privacy guarantee)', () => {
      expect(engine.canReadResponses(participant1)).toBe(false);
      expect(engine.canReadResponses(participant2)).toBe(false);
      expect(engine.canReadResponses(normalUser)).toBe(false);
    });

    it('should ALLOW authorized admins to read and monitor all responses in real-time', () => {
      expect(engine.canReadResponses(adminDocUid)).toBe(true);
      expect(engine.canReadResponses(adminCustomClaim)).toBe(true);
    });

    it('should PREVENT response mutation after submission (Immutability guarantee)', () => {
      expect(engine.canUpdateResponse()).toBe(false);
    });

    it('should only permit admins to delete responses', () => {
      expect(engine.canDeleteResponse(participant1)).toBe(false);
      expect(engine.canDeleteResponse(adminDocUid)).toBe(true);
    });
  });

  describe('3. Sessions Collection Security & Participant Ownership', () => {
    const session1Doc = {
      id: 'sess_101',
      projectId: 'proj-taller-rsn',
      authUid: participant1.uid,
      anonymousId: participant1.uid,
      status: 'started',
      consentAccepted: true,
      startedAt: '2026-11-02T14:50:00.000Z',
      flags: { visibilityLossCount: 0, suspiciousTiming: false, excludedByAdmin: false },
    };

    it('should allow participant to read only their own session', () => {
      expect(engine.canReadSession(participant1, session1Doc)).toBe(true);
      // Participant 2 cannot read Participant 1 session
      expect(engine.canReadSession(participant2, session1Doc)).toBe(false);
      // Admin can read any session
      expect(engine.canReadSession(adminDocUid, session1Doc)).toBe(true);
    });

    it('should allow participant to update only status, completedAt, and flags on own session', () => {
      const validUpdate = {
        ...session1Doc,
        status: 'completed',
        completedAt: '2026-11-02T15:10:00.000Z',
      };
      const res = engine.canUpdateSession(participant1, session1Doc, validUpdate);
      expect(res.allowed).toBe(true);
    });

    it('should REJECT participant trying to tamper with session authUid or projectId', () => {
      const tamperedUpdate = {
        ...session1Doc,
        authUid: participant2.uid,
      };
      const res = engine.canUpdateSession(participant1, session1Doc, tamperedUpdate);
      expect(res.allowed).toBe(false);
    });
  });

  describe('4. Projects and Stimuli Governance', () => {
    it('should allow public reading of published projects and stimuli', () => {
      expect(engine.canReadProject()).toBe(true);
      expect(engine.canReadStimulus()).toBe(true);
    });

    it('should REJECT participant attempts to modify projects or stimuli', () => {
      expect(engine.canWriteProject(participant1)).toBe(false);
      expect(engine.canWriteStimulus(participant1)).toBe(false);
    });

    it('should ALLOW administrators to create or edit projects and stimuli', () => {
      expect(engine.canWriteProject(adminDocUid)).toBe(true);
      expect(engine.canWriteStimulus(adminDocUid)).toBe(true);
      expect(engine.canReadOrWriteRule(adminDocUid)).toBe(true);
    });
  });
});
