import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Dashboard';
import DashboardLayout from './pages/dashboard/DashboardLayout';

// Protected route — redirects to login if no token, or wrong role
const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');

  if (!token) return <Navigate to="/dashboard" replace />;
  if (allowedRoles && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard/main" replace />;
  }
  return children;
};

function App() {
  return (
    <Routes>
      {/* Root redirects to login */}
      <Route path="/" element={<Navigate to="/dashboard" replace />} />

      {/* Login page */}
      <Route path="/dashboard" element={<Login />} />

      {/* Dashboard and its subroutes */}
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute allowedRoles={['Project Manager', 'Planner', 'Cost Engineer', 'Site Engineer', 'Management']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;