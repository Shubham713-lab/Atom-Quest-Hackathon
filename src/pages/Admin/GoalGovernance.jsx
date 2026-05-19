import { useState, useEffect, useContext } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';
import { Shield, Unlock } from 'lucide-react';

const GoalGovernance = () => {
  const { user: currentUser } = useContext(AuthContext);
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

  const handleUnlockGoal = async (goalId) => {
    if (!window.confirm("Are you sure you want to unlock this goal? This will allow edits and should only be done for exceptions.")) return;
    
    try {
      await updateDoc(doc(db, 'goals', goalId), { isLocked: false });
      await addDoc(collection(db, 'auditLogs'), {
        goalId,
        action: 'ADMIN_UNLOCK',
        userId: currentUser.uid,
        createdAt: new Date().toISOString()
      });
      
      setGoals(goals.map(g => g.id === goalId ? { ...g, isLocked: false } : g));
      alert('Goal successfully unlocked.');
    } catch (err) {
      alert('Failed to unlock goal.');
    }
  };

  if (loading) return <div className="p-4 text-gray-500 animate-pulse">Loading data...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Goal Governance</h2>
      </div>

      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Shield size={20} className="text-gray-500" />
            Global Goal Exception Handling
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Goal Title</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Owner</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Exception Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {goals.map((goal) => {
                const owner = users.find(u => u.id === goal.employeeId);
                return (
                  <tr key={goal.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-medium text-gray-900">{goal.title}</div>
                      <div className="text-xs text-gray-400 mt-0.5">ID: {goal.id}</div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {owner ? owner.name : 'Unknown User'}
                    </td>
                    <td className="px-6 py-4">
                      {goal.isLocked ? (
                        <span className="badge bg-red-100 text-red-800">LOCKED</span>
                      ) : (
                        <span className="badge bg-gray-100 text-gray-800">UNLOCKED</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => handleUnlockGoal(goal.id)}
                        disabled={!goal.isLocked}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                          goal.isLocked 
                            ? 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200' 
                            : 'bg-gray-50 text-gray-400 cursor-not-allowed border border-gray-200'
                        }`}
                      >
                        <Unlock size={14} /> Unlock Goal
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default GoalGovernance;
