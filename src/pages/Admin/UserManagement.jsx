import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Users, BarChart3, CheckCircle2, Clock } from 'lucide-react';
import { getCurrentWindow, setMockMonth } from '../../utils/timeWindows';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(getCurrentWindow().monthIndex);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersSnap, goalsSnap] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'goals'))
      ]);
      
      const usersData = [];
      usersSnap.forEach(d => usersData.push({ id: d.id, ...d.data() }));
      setUsers(usersData);

      const goalsData = [];
      goalsSnap.forEach(d => goalsData.push({ id: d.id, ...d.data() }));
      setGoals(goalsData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId, newRole) => {
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    } catch (err) {
      alert('Failed to update role');
    }
  };

  const handleTimeTravel = (monthIndex) => {
    if (monthIndex === '') {
      setMockMonth(null);
    } else {
      setMockMonth(parseInt(monthIndex, 10));
    }
    setCurrentMonth(getCurrentWindow().monthIndex);
    // Force reload to instantly apply the time travel across the entire app
    window.location.reload();
  };

  if (loading) return <div className="p-4 text-gray-500 animate-pulse">Loading data...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Users & Cycles</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Users size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Users</p>
            <p className="text-2xl font-bold text-gray-900">{users.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><BarChart3 size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Goals Created</p>
            <p className="text-2xl font-bold text-gray-900">{goals.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg"><CheckCircle2 size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Approved Goals</p>
            <p className="text-2xl font-bold text-gray-900">{goals.filter(g => g.status === 'APPROVED').length}</p>
          </div>
        </div>
      </div>

      {/* Time Travel Simulator */}
      <div className="bg-gradient-to-r from-orange-50 to-red-50 p-6 rounded-xl border border-orange-200 shadow-sm flex flex-col md:flex-row gap-6 items-start md:items-center justify-between">
        <div className="flex gap-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-lg shrink-0 h-12 w-12 flex items-center justify-center">
            <Clock size={24} />
          </div>
          <div>
            <h3 className="font-bold text-orange-900 flex items-center gap-2">
              Time Travel Simulator <span className="badge bg-orange-200 text-orange-800 text-[10px]">DEV ONLY</span>
            </h3>
            <p className="text-sm text-orange-700 mt-1">Mock the system date to test strict Check-in enforcement windows during the demo.</p>
          </div>
        </div>
        <div className="shrink-0 w-full md:w-auto">
          <select 
            className="input bg-white border-orange-300 focus:ring-orange-500 focus:border-orange-500 text-sm font-medium w-full"
            value={localStorage.getItem('dev_mock_month') || ''}
            onChange={(e) => handleTimeTravel(e.target.value)}
          >
            <option value="">-- Use Real System Clock --</option>
            <option value="4">May (Phase 1: Goal Setting)</option>
            <option value="6">July (Q1 Check-in)</option>
            <option value="9">October (Q2 Check-in)</option>
            <option value="0">January (Q3 Check-in)</option>
            <option value="2">March (Q4 / Annual)</option>
            <option value="5">June (System Closed / Read-Only)</option>
          </select>
          <p className="text-xs text-orange-600 font-medium mt-2 text-right">
            Current Phase: <strong>{getCurrentWindow().windowName}</strong>
          </p>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900">User Management</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">{u.name}</div>
                    <div className="text-xs text-gray-400">UID: {u.id}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{u.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <select
                      value={u.role}
                      onChange={(e) => handleRoleChange(u.id, e.target.value)}
                      className="input py-1 text-sm bg-white"
                    >
                      <option value="EMPLOYEE">Employee</option>
                      <option value="MANAGER">Manager</option>
                      <option value="ADMIN">Admin</option>
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
