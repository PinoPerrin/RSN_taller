import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';

// Public Landing & Auth Pages
import { LandingPage } from './pages/public/LandingPage';
import { LoginPage } from './pages/auth/LoginPage';
import { RegisterPage } from './pages/auth/RegisterPage';
import { ForgotPasswordPage } from './pages/auth/ForgotPasswordPage';
import { CompleteProfilePage } from './pages/auth/CompleteProfilePage';

// Route Guards
import { RequireAuth, RequireAdmin } from './components/auth/AuthGuards';

// User Portal Pages
import { UserDashboard } from './pages/user/UserDashboard';
import { UserProjectsPage } from './pages/user/UserProjectsPage';
import { CreateProjectPage } from './pages/user/CreateProjectPage';
import { UserProfilePage } from './pages/user/UserProfilePage';
import { UserSupportPage } from './pages/user/UserSupportPage';
import { UserManualPage } from './pages/user/UserManualPage';

// Participant Flow
import { ParticipantContainer } from './pages/participant/ParticipantContainer';

// Admin Core Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { AdminUsersPage } from './pages/admin/AdminUsersPage';
import { AdminUserProjectsPage } from './pages/admin/AdminUserProjectsPage';
import { AdminSupportPage } from './pages/admin/AdminSupportPage';
import { AdminStatsPage } from './pages/admin/AdminStatsPage';

// Existing Workshop and Analysis Modules (reusable for both admin and user projects)
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
      {/* 1. Public Landing & Auth Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/complete-profile" element={<CompleteProfilePage />} />
      <Route path="/manual-publico" element={<UserManualPage />} />

      {/* 2. Participant Public Flow (QR / link access) */}
      <Route path="/p/:projectId" element={<ParticipantContainer />} />

      {/* 3. User Portal Protected Routes (/app) */}
      <Route
        path="/app"
        element={
          <RequireAuth>
            <UserDashboard />
          </RequireAuth>
        }
      />
      <Route
        path="/app/projects"
        element={
          <RequireAuth>
            <UserProjectsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/projects/new"
        element={
          <RequireAuth>
            <CreateProjectPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/manual"
        element={
          <RequireAuth>
            <UserManualPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/support"
        element={
          <RequireAuth>
            <UserSupportPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/profile"
        element={
          <RequireAuth>
            <UserProfilePage />
          </RequireAuth>
        }
      />

      {/* User Analysis Subroutes (reusing analysis components seamlessly) */}
      <Route
        path="/app/projects/:projectId/live"
        element={
          <RequireAuth>
            <LiveMonitorPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/projects/:projectId/responses"
        element={
          <RequireAuth>
            <ResponsesQualityPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/projects/:projectId/traditional"
        element={
          <RequireAuth>
            <TraditionalRSNPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/projects/:projectId/pathfinder"
        element={
          <RequireAuth>
            <PathfinderPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/projects/:projectId/interpretation"
        element={
          <RequireAuth>
            <SemanticInterpretationPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/projects/:projectId/graphs"
        element={
          <RequireAuth>
            <ModernGraphPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/projects/:projectId/compare"
        element={
          <RequireAuth>
            <NetworkComparisonPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/projects/:projectId/normalization"
        element={
          <RequireAuth>
            <NormalizationPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/projects/:projectId/corrections"
        element={
          <RequireAuth>
            <ManualCorrectionsPage />
          </RequireAuth>
        }
      />
      <Route
        path="/app/projects/:projectId/export"
        element={
          <RequireAuth>
            <ExportsReportPage />
          </RequireAuth>
        }
      />

      {/* 4. Administrator Protected Routes (/admin) */}
      <Route
        path="/admin"
        element={
          <RequireAdmin>
            <AdminDashboard />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/users"
        element={
          <RequireAdmin>
            <AdminUsersPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/user-projects"
        element={
          <RequireAdmin>
            <AdminUserProjectsPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/support"
        element={
          <RequireAdmin>
            <AdminSupportPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/stats"
        element={
          <RequireAdmin>
            <AdminStatsPage />
          </RequireAdmin>
        }
      />

      {/* Existing Workshop Admin Features */}
      <Route
        path="/admin/projects"
        element={
          <RequireAdmin>
            <ProjectManagement />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/projects/new"
        element={
          <RequireAdmin>
            <ProjectManagement />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/projects/:projectId/live"
        element={
          <RequireAdmin>
            <LiveMonitorPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/projects/:projectId/responses"
        element={
          <RequireAdmin>
            <ResponsesQualityPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/projects/:projectId/traditional"
        element={
          <RequireAdmin>
            <TraditionalRSNPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/projects/:projectId/pathfinder"
        element={
          <RequireAdmin>
            <PathfinderPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/projects/:projectId/interpretation"
        element={
          <RequireAdmin>
            <SemanticInterpretationPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/projects/:projectId/graphs"
        element={
          <RequireAdmin>
            <ModernGraphPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/projects/:projectId/compare"
        element={
          <RequireAdmin>
            <NetworkComparisonPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/projects/:projectId/normalization"
        element={
          <RequireAdmin>
            <NormalizationPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/projects/:projectId/corrections"
        element={
          <RequireAdmin>
            <ManualCorrectionsPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/projects/:projectId/export"
        element={
          <RequireAdmin>
            <ExportsReportPage />
          </RequireAdmin>
        }
      />
      <Route
        path="/admin/methodology"
        element={
          <RequireAdmin>
            <MethodologyPage />
          </RequireAdmin>
        }
      />

      {/* 5. Fullscreen Presentation Mode for Projectors */}
      <Route path="/presentation/:projectId" element={<PresentationModePage />} />
      <Route path="/admin/projects/:projectId/presentation" element={<PresentationModePage />} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default App;
