import React from 'react';
import {
  BrowserRouter as Router,
  Navigate,
  Route,
  Routes,
} from 'react-router-dom';

import AdminDashboard from './pages/AdminDashboard';
import Chat from './pages/Chat';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import Login from './pages/Login';
import NewRequest from './pages/NewRequest';
import Profile from './pages/Profile';
import Register from './pages/Register';
import ResetPassword from './pages/ResetPassword';
import Schedule from './pages/Schedule';
import ServicesWithFeedback from './pages/ServicesWithFeedback';

const isAuthenticated = () => !!localStorage.getItem('token');
const isAdmin = () => localStorage.getItem('role') === 'admin';

const PrivateRoute = ({ children, adminOnly = false }) => {
  if (!isAuthenticated()) {
    return <Navigate to="/login" />;
  }
  if (adminOnly && !isAdmin()) {
    return <Navigate to="/dashboard" />;
  }
  return children;
};

const AppRoutes = () => (
  <Router>
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/services" element={<ServicesWithFeedback />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route
        path="/dashboard"
        element={(
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        )}
      />
      <Route
        path="/profile"
        element={(
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        )}
      />
      <Route
        path="/chat"
        element={(
          <PrivateRoute>
            <Chat />
          </PrivateRoute>
        )}
      />
      <Route
        path="/new-request"
        element={(
          <PrivateRoute>
            <NewRequest />
          </PrivateRoute>
        )}
      />
      <Route
        path="/schedule"
        element={(
          <PrivateRoute>
            <Schedule />
          </PrivateRoute>
        )}
      />
      <Route
        path="/admin"
        element={(
          <PrivateRoute adminOnly>
            <AdminDashboard />
          </PrivateRoute>
        )}
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  </Router>
);

export default AppRoutes;
