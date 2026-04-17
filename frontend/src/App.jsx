import { Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Dashboard';
import DashboardLayout from './pages/dashboard/DashboardLayout';
import Overview from './pages/dashboard/features/Overview';
import Manpower from './pages/dashboard/features/Manpower';
import Empty from './pages/dashboard/features/Empty';

const ProtectedRoute = ({ children, allowedRoles }) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole');
  if (!token) return <Navigate to="/login" replace />;
  if (allowedRoles && !allowedRoles.includes(userRole)) return <Navigate to="/dashboard/overview" replace />;
  return children;
};

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      
      <Route path="/dashboard" element={<ProtectedRoute allowedRoles={['Project Manager', 'Planner', 'Cost Engineer', 'Site Engineer', 'Management']}><DashboardLayout /></ProtectedRoute>}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<Overview />} />
        {/* Rute Teknis Field Resource */}
        <Route path="manpower" element={<ProtectedRoute allowedRoles={['Project Manager', 'Planner', 'Site Engineer']}><Manpower /></ProtectedRoute>} />
        <Route path="empty" element={<ProtectedRoute allowedRoles={['Project Manager', 'Planner', 'Site Engineer']}><Empty /></ProtectedRoute>} />
        
        {/* Rute Khusus Budget */}
        <Route path="budget" element={<ProtectedRoute allowedRoles={['Project Manager', 'Cost Engineer']}><Empty /></ProtectedRoute>} />
      </Route>
      
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;