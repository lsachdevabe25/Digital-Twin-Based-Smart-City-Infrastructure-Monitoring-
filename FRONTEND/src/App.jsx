import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import './Dashboard.css';
import DashboardLayout from './components/layout/DashboardLayout';
import SplashScreen from './components/common/SplashScreen';
import LoginPage from './pages/LoginPage';
import AnalyzerPage from './pages/AnalyzerPage';
import NetworkGraphPage from './pages/NetworkGraphPage';
import RepairPlanPage from './pages/RepairPlanPage';
import PowerFailurePage from './pages/PowerFailurePage';
import NotFoundPage from './pages/NotFoundPage';
import { BackendStatusProvider } from './context/BackendStatusProvider';
import { AuthProvider, ProtectedRoute } from './context/AuthContext';

export function App() {
  // Full-screen splash displays on every load and refresh for 3 seconds
  const [showSplash, setShowSplash] = useState(true);

  useEffect(() => {
    document.title = 'Digital Twin-Based Smart City Infrastructure Monitoring';
  }, []);

  return (
    <AuthProvider>
      <BackendStatusProvider>
        {/* Splash Screen */}
        {showSplash && (
          <SplashScreen onComplete={() => setShowSplash(false)} />
        )}

        {/* Application Routes */}
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          {/* Protected Console Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AnalyzerPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/network-graph"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <NetworkGraphPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/repair-plan"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <RepairPlanPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
          <Route
            path="/power-failure"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <PowerFailurePage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />

          {/* 404 Catch-All */}
          <Route
            path="*"
            element={
              <ProtectedRoute>
                <DashboardLayout>
                  <NotFoundPage />
                </DashboardLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </BackendStatusProvider>
    </AuthProvider>
  );
}

export default App;
