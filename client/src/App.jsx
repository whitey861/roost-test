import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { Layout } from '@/components/Layout';
import { LoginPage } from '@/pages/LoginPage';
import { Dashboard } from '@/pages/Dashboard';
import { JobsList } from '@/pages/JobsList';
import { JobDetail } from '@/pages/JobDetail';
import { NewJobWizard } from '@/pages/NewJobWizard';
import { FileBrowser } from '@/pages/FileBrowser';
import { AdminDashboard } from '@/pages/AdminDashboard';

function ProtectedRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="p-8">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/dashboard" />;
  }

  return <Layout>{children}</Layout>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route
        path="/login"
        element={user ? <Navigate to="/dashboard" /> : <LoginPage />}
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs"
        element={
          <ProtectedRoute>
            <JobsList />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs/new"
        element={
          <ProtectedRoute>
            <NewJobWizard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/jobs/:id"
        element={
          <ProtectedRoute>
            <JobDetail />
          </ProtectedRoute>
        }
      />
      <Route
        path="/files"
        element={
          <ProtectedRoute>
            <FileBrowser />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<Navigate to="/dashboard" />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  );
}
