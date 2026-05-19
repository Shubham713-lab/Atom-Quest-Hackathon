import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useContext } from 'react';
import { AuthProvider, AuthContext } from './context/AuthContext';
import SidebarLayout from './components/layout/SidebarLayout';
import Login from './pages/Login';
import ProtectedRoute from './routes/ProtectedRoute';

// Employee Routes
import EmployeeDashboard from './pages/Dashboard/EmployeeDashboard';
import CreateGoal from './pages/Goals/CreateGoal';
import EditGoal from './pages/Goals/EditGoal';
import CheckInGoal from './pages/Goals/CheckInGoal';

// Manager Routes
import ManagerDashboard from './pages/Dashboard/ManagerDashboard';
import CreateSharedGoal from './pages/Goals/CreateSharedGoal';

// Admin Routes
import UserManagement from './pages/Admin/UserManagement';
import GoalGovernance from './pages/Admin/GoalGovernance';
import CompletionTracking from './pages/Admin/CompletionTracking';
import AuditTrail from './pages/Admin/AuditTrail';
import EscalationLog from './pages/Admin/EscalationLog';
import AnalyticsDashboard from './pages/Admin/AnalyticsDashboard';

function RoleBasedRedirect() {
  const { user } = useContext(AuthContext);

  if (user?.role === 'EMPLOYEE') return <Navigate to="/employee/goals" replace />;
  if (user?.role === 'ADMIN') return <Navigate to="/admin/users" replace />;
  if (user?.role === 'MANAGER') return <Navigate to="/manager/team" replace />;

  return <div className="p-4 text-gray-500">Determining role...</div>;
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Route */}
          <Route path="/login" element={<Login />} />

          {/* Protected Sidebar Layout */}
          <Route path="/" element={<ProtectedRoute><SidebarLayout /></ProtectedRoute>}>
            {/* Root Redirect */}
            <Route index element={<RoleBasedRedirect />} />

            {/* Admin Routes */}
            <Route path="admin/users" element={<ProtectedRoute allowedRoles={['ADMIN']}><UserManagement /></ProtectedRoute>} />
            <Route path="admin/analytics" element={<ProtectedRoute allowedRoles={['ADMIN']}><AnalyticsDashboard /></ProtectedRoute>} />
            <Route path="admin/governance" element={<ProtectedRoute allowedRoles={['ADMIN']}><GoalGovernance /></ProtectedRoute>} />
            <Route path="admin/completion" element={<ProtectedRoute allowedRoles={['ADMIN']}><CompletionTracking /></ProtectedRoute>} />
            <Route path="admin/escalations" element={<ProtectedRoute allowedRoles={['ADMIN']}><EscalationLog /></ProtectedRoute>} />
            <Route path="admin/audit" element={<ProtectedRoute allowedRoles={['ADMIN']}><AuditTrail /></ProtectedRoute>} />

            {/* Manager Routes */}
            <Route path="manager/team" element={<ProtectedRoute allowedRoles={['MANAGER']}><ManagerDashboard /></ProtectedRoute>} />

            {/* Employee Routes */}
            <Route path="employee/goals" element={<ProtectedRoute allowedRoles={['EMPLOYEE']}><EmployeeDashboard /></ProtectedRoute>} />

            {/* Goal Action Routes */}
            <Route path="goals/create" element={<ProtectedRoute allowedRoles={['EMPLOYEE']}><CreateGoal /></ProtectedRoute>} />
            <Route path="goals/:id/edit" element={<ProtectedRoute allowedRoles={['EMPLOYEE']}><EditGoal /></ProtectedRoute>} />
            <Route path="goals/shared/create" element={<ProtectedRoute allowedRoles={['ADMIN', 'MANAGER']}><CreateSharedGoal /></ProtectedRoute>} />
            <Route path="goals/:id/checkin" element={<ProtectedRoute allowedRoles={['EMPLOYEE']}><CheckInGoal /></ProtectedRoute>} />
          </Route>

          {/* Catch All */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
