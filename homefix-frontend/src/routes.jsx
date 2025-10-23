import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Profile from './pages/Profile';
import Chat from './pages/Chat';
import NewRequest from './pages/NewRequest';
import Schedule from './pages/Schedule';
import AdminDashboard from './pages/AdminDashboard';

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

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Público */}
        <Route path="/" element={<Home />} />

        {/* User Routes */}
        <Route path="/dashboard" element={
          <PrivateRoute>
            <Dashboard />
          </PrivateRoute>
        }/>
        <Route path="/profile" element={
          <PrivateRoute>
            <Profile />
          </PrivateRoute>
        }/>
        <Route path="/chat" element={
          <PrivateRoute>
            <Chat />
          </PrivateRoute>
        }/>
        <Route path="/new-request" element={
          <PrivateRoute>
            <NewRequest />
          </PrivateRoute>
        }/>
        <Route path="/schedule" element={
          <PrivateRoute>
            <Schedule />
          </PrivateRoute>
        }/>

        {/* Admin Only */}
        <Route path="/admin" element={
          <PrivateRoute adminOnly={true}>
            <AdminDashboard />
          </PrivateRoute>
        }/>

        {/* Default */}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;

