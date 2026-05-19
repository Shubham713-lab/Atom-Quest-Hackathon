import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { Activity, Download } from 'lucide-react';
import { exportAchievementReport } from '../../utils/exportCSV';

const CompletionTracking = () => {
  const [users, setUsers] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const getCompletionStats = () => {
    const employeeUsers = users.filter(u => u.role === 'EMPLOYEE');
    return employeeUsers.map(emp => {
      const empGoals = goals.filter(g => g.employeeId === emp.id);
      
      if (empGoals.length === 0) return { emp, status: 'No Goals Created', color: 'bg-gray-100 text-gray-800' };
      
      const allAchievementsLogged = empGoals.every(g => g.achievement !== undefined && g.achievement !== null && g.achievement !== '');
      const allCommentsLogged = empGoals.every(g => g.managerComment);
      
      if (!allAchievementsLogged) return { emp, status: 'Pending Employee Check-In', color: 'bg-yellow-100 text-yellow-800' };
      if (allAchievementsLogged && !allCommentsLogged) return { emp, status: 'Pending Manager Review', color: 'bg-orange-100 text-orange-800' };
      
      return { emp, status: 'Fully Completed', color: 'bg-green-100 text-green-800' };
    });
  };

  if (loading) return <div className="p-4 text-gray-500 animate-pulse">Loading tracking data...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Completion Dashboard</h2>
        <button
          onClick={() => exportAchievementReport(goals, users)}
          className="btn-secondary"
        >
          <Download size={18} />
          Export CSV Report
        </button>
      </div>

      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Activity size={20} className="text-gray-500" />
            Quarterly Check-In Tracking
          </h3>
          <p className="text-sm text-gray-500 mt-1">Real-time view of check-in lifecycle completion across all employees.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Active Goals</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking Status</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {getCompletionStats().map((stat, i) => (
                <tr key={i} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{stat.emp.name}</div>
                    <div className="text-xs text-gray-500">{stat.emp.email}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">
                    {goals.filter(g => g.employeeId === stat.emp.id).length} Goals
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge border ${stat.color} ${stat.color.replace('bg-', 'border-').replace('100', '200')}`}>
                      {stat.status}
                    </span>
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

export default CompletionTracking;
