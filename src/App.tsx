import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import LoginSignup from './pages/LoginSignup';
import PMDashboard from './pages/PMDashboard';
import AdminDashboard from './pages/AdminDashboard';

function PrivateRoute({ children, roles }: { children: React.ReactNode, roles: string[] }) {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white">Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!roles.includes(user.role)) {
    return <Navigate to="/" />;
  }

  return <>{children}</>;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" /> : <LoginSignup />} />
      <Route 
        path="/" 
        element={
          <PrivateRoute roles={['pm', 'admin', 'owner']}>
            {user?.role === 'owner' || user?.role === 'admin' ? <AdminDashboard /> : <PMDashboard />}
          </PrivateRoute>
        } 
      />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
        <Toaster position="top-right" toastOptions={{
          style: {
            background: '#18181b',
            color: '#fff',
            border: '1px solid #27272a'
          }
        }} />
      </Router>
    </AuthProvider>
  );
}
