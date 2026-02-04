import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Dashboard';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import Layout from './layout/Layout';

// a fucntion to indicate the correct user/role 
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
      {/* homepage/public routes */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />
      </Route>

      {/* separate login page(dashboard) */}
      <Route path="/dashboard" element={<Login />} />

      {/* dashboard and its subroutes handling */}
      <Route
        path="/dashboard/*"
        element={
          <ProtectedRoute allowedRoles={['Project Manager', 'Planner', 'Cost Engineer', 'Site Engineer', 'Management']}>
            <DashboardLayout />
          </ProtectedRoute>
        }
      />

      {/* catch all pages */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;