import { Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import Main from './pages/dashboard/features/Main';
import Manpower from './pages/dashboard/features/Manpower';
import Empty from './pages/dashboard/features/Empty';
import Layout from './layout/Layout';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  if (!token) return <Navigate to="/dashboard" replace />;
  if (allowedRoles && !allowedRoles.includes(userRole)) return <Navigate to="/dashboard/main" replace />;
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}><Route index element={<Home />} /></Route>
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['Project Manager', 'Planner', 'Cost Engineer', 'Site Engineer', 'Management']}><DashboardLayout /></ProtectedRoute>}>
        <Route path="main" element={<Main />} />
        {/* Rute Teknis Field Resource [cite: 114, 116, 118, 120, 122] */}
        <Route path="manpower" element={<ProtectedRoute allowedRoles={['Project Manager', 'Planner', 'Site Engineer']}><Manpower /></ProtectedRoute>} />
        <Route path="empty" element={<ProtectedRoute allowedRoles={['Project Manager', 'Planner', 'Site Engineer']}><Empty /></ProtectedRoute>} />
        
        {/* Rute Khusus Budget [cite: 124, 422] */}
        <Route path="budget" element={<ProtectedRoute allowedRoles={['Project Manager', 'Cost Engineer']}><Empty /></ProtectedRoute>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;