import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Participant Flow
import { ParticipantContainer } from './pages/participant/ParticipantContainer';

// Admin Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { ProjectManagement } from './pages/admin/ProjectManagement';
import { LiveMonitorPage } from './pages/admin/LiveMonitorPage';
import { ResponsesQualityPage } from './pages/admin/ResponsesQualityPage';
import { TraditionalRSNPage } from './pages/admin/TraditionalRSNPage';
import { PathfinderPage } from './pages/admin/PathfinderPage';
import { SemanticInterpretationPage } from './pages/admin/SemanticInterpretationPage';
import { ModernGraphPage } from './pages/admin/ModernGraphPage';
import { NetworkComparisonPage } from './pages/admin/NetworkComparisonPage';
import { NormalizationPage } from './pages/admin/NormalizationPage';
import { ManualCorrectionsPage } from './pages/admin/ManualCorrectionsPage';
import { ExportsReportPage } from './pages/admin/ExportsReportPage';
import { MethodologyPage } from './pages/admin/MethodologyPage';

// Presentation Mode
import { PresentationModePage } from './pages/admin/PresentationModePage';

export const App: React.FC = () => {
  return (
    <Routes>
      {/* Root redirect */}
      <Route path="/" element={<Navigate to="/admin" replace />} />

      {/* Participant Public Flow */}
      <Route path="/p/:projectId" element={<ParticipantContainer />} />

      {/* Admin Protected Dashboard */}
      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/projects" element={<ProjectManagement />} />
      <Route path="/admin/projects/new" element={<ProjectManagement />} />
      <Route path="/admin/projects/:projectId/live" element={<LiveMonitorPage />} />
      <Route path="/admin/projects/:projectId/responses" element={<ResponsesQualityPage />} />
      <Route path="/admin/projects/:projectId/traditional" element={<TraditionalRSNPage />} />
      <Route path="/admin/projects/:projectId/pathfinder" element={<PathfinderPage />} />
      <Route path="/admin/projects/:projectId/interpretation" element={<SemanticInterpretationPage />} />
      <Route path="/admin/projects/:projectId/graphs" element={<ModernGraphPage />} />
      <Route path="/admin/projects/:projectId/compare" element={<NetworkComparisonPage />} />
      <Route path="/admin/projects/:projectId/normalization" element={<NormalizationPage />} />
      <Route path="/admin/projects/:projectId/corrections" element={<ManualCorrectionsPage />} />
      <Route path="/admin/projects/:projectId/export" element={<ExportsReportPage />} />
      <Route path="/admin/methodology" element={<MethodologyPage />} />

      {/* Fullscreen Presentation Mode for Projectors */}
      <Route path="/presentation/:projectId" element={<PresentationModePage />} />
      <Route path="/admin/projects/:projectId/presentation" element={<PresentationModePage />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
};

export default App;
