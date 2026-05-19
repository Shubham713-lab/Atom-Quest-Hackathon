import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { Target, CheckCircle2, CheckSquare } from 'lucide-react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';
import { getCurrentWindow } from '../../utils/timeWindows';

const PROGRESS_BADGE = {
  'Completed': 'bg-green-100 text-green-800',
  'On Track': 'bg-blue-100 text-blue-800',
  'Not Started': 'bg-gray-100 text-gray-600',
};

const formatTimelineDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
};

const EmployeeApprovedGoals = () => {
  const { user } = useContext(AuthContext);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (user?.uid) fetchGoals();
  }, [user]);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const goalsRef = collection(db, 'goals');
      const q = query(goalsRef, where("employeeId", "==", user.uid), where("status", "==", "APPROVED"));
      const querySnapshot = await getDocs(q);
      const goalsData = [];
      querySnapshot.forEach((doc) => {
        goalsData.push({ id: doc.id, ...doc.data() });
      });
      
      goalsData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setGoals(goalsData);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch approved goals');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium">Loading approved goals...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">
        <p className="font-semibold">Error loading dashboard</p>
        <p className="text-sm">{error}</p>
        <button onClick={fetchGoals} className="mt-2 text-sm text-red-600 hover:underline">Try Again</button>
      </div>
    );
  }

  const currentWindow = getCurrentWindow();
  const { activePhase } = currentWindow;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <CheckSquare className="text-green-600" size={28} />
            Approved Goals
          </h2>
          <p className="text-sm text-gray-500 mt-1">These goals have been locked and approved. Check in to log your achievements.</p>
        </div>
      </div>

      {/* Goals Table / Empty State */}
      {goals.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <CheckSquare className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-base font-semibold text-gray-900">No approved goals yet</h3>
          <p className="mt-1 text-sm text-gray-500 mb-6">Goals will appear here once your manager approves them.</p>
          <Link 
            to="/employee/goals" 
            className="btn-secondary"
          >
            View All Goals
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold text-gray-700">Goal Details</th>
                  <th className="px-5 py-4 text-left font-semibold text-gray-700">Target</th>
                  <th className="px-5 py-4 text-left font-semibold text-gray-700">Achievement & Score</th>
                  <th className="px-5 py-4 text-left font-semibold text-gray-700">Approval Info</th>
                  <th className="px-5 py-4 text-right font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {goals.map((goal) => (
                  <tr key={goal.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900 leading-tight mb-1 flex items-center gap-2">
                        {goal.title}
                        {goal.isShared && <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 bg-purple-100 text-purple-700 rounded">Shared KPI</span>}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">{goal.thrustArea}</div>
                      <div className="text-xs text-gray-400 mt-1">{goal.uom}</div>
                      {goal.progressStatus && (
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase ${PROGRESS_BADGE[goal.progressStatus] || 'bg-gray-100'}`}>
                          {goal.progressStatus}
                        </span>
                      )}
                    </td>

                    <td className="px-5 py-4 text-gray-900 font-medium">
                      {goal.uom === 'TIMELINE' ? formatTimelineDate(goal.target) : goal.target || '—'}
                    </td>

                    <td className="px-5 py-4">
                      <div className="mb-2">
                        <span className="text-xs text-gray-500 block mb-0.5">Actual:</span>
                        {goal.achievement !== undefined && goal.achievement !== '' ? (
                          <span className="font-semibold text-gray-900">
                            {goal.uom === 'TIMELINE' ? formatTimelineDate(goal.achievement) : goal.achievement}
                            {goal.uom === 'PERCENTAGE' ? '%' : ''}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-xs italic">Not logged</span>
                        )}
                      </div>
                      
                      {goal.computedScore != null && (
                        <div>
                           <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs text-gray-500">Score:</span>
                            <span className={`text-xs font-bold ${goal.computedScore >= 80 ? 'text-green-700' : goal.computedScore >= 50 ? 'text-yellow-700' : 'text-red-600'}`}>
                              {goal.computedScore}%
                            </span>
                          </div>
                          <div className="w-full max-w-[120px] bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${goal.computedScore >= 80 ? 'bg-green-500' : goal.computedScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${goal.computedScore}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </td>

                    <td className="px-5 py-4">
                      <span className="badge border bg-green-100 text-green-800 border-green-200">
                        APPROVED 🔒
                      </span>
                      {goal.statusUpdatedBy && (
                        <div className="text-xs text-gray-500 mt-1">
                          By: <span className="font-medium text-gray-700">{goal.statusUpdatedBy}</span>
                        </div>
                      )}
                      <div className="text-xs text-gray-400 mt-1">Weight: {goal.weightage}%</div>
                    </td>

                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        {(!goal.isShared || goal.ownerId === user.uid) && activePhase === 'CHECKIN' ? (
                          <Link to={`/goals/${goal.id}/checkin`} className="btn-primary py-1 px-3 text-xs">
                            <CheckCircle2 size={14} /> Log Check-in
                          </Link>
                        ) : activePhase !== 'CHECKIN' ? (
                          <span className="text-xs text-gray-400 italic">Check-in closed</span>
                        ) : (
                           <span className="text-xs text-gray-400 italic">Shared goal</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeApprovedGoals;
