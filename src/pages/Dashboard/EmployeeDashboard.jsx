import { useState, useEffect, useContext } from 'react';
import { Link } from 'react-router-dom';
import { PlusCircle, Target, Activity, TrendingUp, MessageSquare, Edit3, CheckCircle2, Clock, Send } from 'lucide-react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';
import { getCurrentWindow } from '../../utils/timeWindows';

const PROGRESS_BADGE = {
  'Completed': 'bg-green-100 text-green-800',
  'On Track': 'bg-blue-100 text-blue-800',
  'Not Started': 'bg-gray-100 text-gray-600',
};

const STATUS_BADGE = {
  'APPROVED': 'bg-green-100 text-green-800 border-green-200',
  'SUBMITTED': 'bg-blue-100 text-blue-800 border-blue-200',
  'REWORK': 'bg-orange-100 text-orange-800 border-orange-200',
  'REJECTED': 'bg-red-100 text-red-800 border-red-200',
  'DRAFT': 'bg-gray-100 text-gray-800 border-gray-200',
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

const EmployeeDashboard = () => {
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
      const q = query(goalsRef, where("employeeId", "==", user.uid));
      const querySnapshot = await getDocs(q);
      const goalsData = [];
      querySnapshot.forEach((doc) => {
        goalsData.push({ id: doc.id, ...doc.data() });
      });
      
      // Sort goals client-side by creation date (newest first)
      goalsData.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      setGoals(goalsData);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  };

  const submitGoal = async (goalId) => {
    try {
      await updateDoc(doc(db, 'goals', goalId), { status: 'SUBMITTED' });
      setGoals(goals.map(g => g.id === goalId ? { ...g, status: 'SUBMITTED' } : g));
    } catch (err) {
      alert('Failed to submit goal for approval.');
    }
  };

  const totalWeightage = goals.reduce((sum, goal) => sum + goal.weightage, 0);
  const avgScore = goals.filter(g => g.computedScore != null).length > 0
    ? Math.round(goals.reduce((s, g) => s + (g.computedScore ?? 0), 0) / goals.filter(g => g.computedScore != null).length)
    : null;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium">Loading your dashboard...</p>
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
  const { activePhase, windowName, description } = currentWindow;

  return (
    <div className="space-y-6">
      {/* Time Window Banner */}
      <div className={`p-4 rounded-xl border ${
        activePhase === 'SETTING' ? 'bg-blue-50 border-blue-200 text-blue-900' :
        activePhase === 'CHECKIN' ? 'bg-green-50 border-green-200 text-green-900' :
        'bg-gray-100 border-gray-300 text-gray-800'
      }`}>
        <div className="flex items-center gap-3">
          <div className={`p-2 rounded-lg ${
            activePhase === 'SETTING' ? 'bg-blue-100 text-blue-700' :
            activePhase === 'CHECKIN' ? 'bg-green-100 text-green-700' :
            'bg-gray-200 text-gray-700'
          }`}>
            <Clock size={24} />
          </div>
          <div>
            <h3 className="font-bold">Current Phase: {windowName}</h3>
            <p className="text-sm mt-0.5">{description}</p>
          </div>
        </div>
      </div>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight">My Goals</h2>
          <p className="text-sm text-gray-500 mt-1">Manage your objectives and track your progress.</p>
        </div>
        {totalWeightage < 100 && goals.length < 8 && (
          <Link 
            to="/goals/create" 
            className={`shrink-0 ${activePhase === 'SETTING' ? 'btn-primary' : 'btn-secondary opacity-50 cursor-not-allowed pointer-events-none'}`}
            title={activePhase !== 'SETTING' ? 'Goal creation is only allowed during Phase 1.' : ''}
          >
            <PlusCircle size={18} />
            Create Goal
          </Link>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Target size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Goals</p>
            <p className="text-2xl font-bold text-gray-900">{goals.length}<span className="text-sm text-gray-400 font-normal"> / 8</span></p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl"><Activity size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Weightage</p>
            <p className="text-2xl font-bold text-gray-900">{totalWeightage}%<span className="text-sm text-gray-400 font-normal"> / 100%</span></p>
          </div>
        </div>
        <div className="card flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-xl"><TrendingUp size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Avg. Progress Score</p>
            <p className="text-2xl font-bold text-gray-900">{avgScore !== null ? `${avgScore}%` : 'N/A'}</p>
          </div>
        </div>
      </div>

      {totalWeightage === 100 && (
        <div className="p-4 bg-green-50 text-green-800 rounded-lg border border-green-200 flex items-center gap-3">
          <span className="text-xl">🎉</span>
          <span className="text-sm font-medium">You have successfully assigned 100% of your goal weightage!</span>
        </div>
      )}

      {/* Goals Table / Empty State */}
      {goals.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
          <Target className="mx-auto h-12 w-12 text-gray-300 mb-3" />
          <h3 className="text-base font-semibold text-gray-900">No goals yet</h3>
          <p className="mt-1 text-sm text-gray-500 mb-6">Get started by defining your first objective for this quarter.</p>
          <Link 
            to="/goals/create" 
            className={activePhase === 'SETTING' ? 'btn-primary' : 'btn-secondary opacity-50 pointer-events-none'}
          >
            <PlusCircle size={18} />
            Create First Goal
          </Link>
        </div>
      ) : (
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-4 text-left font-semibold text-gray-700">Goal Details</th>
                  <th className="px-5 py-4 text-left font-semibold text-gray-700">Planned Target</th>
                  <th className="px-5 py-4 text-left font-semibold text-gray-700">Achievement & Score</th>
                  <th className="px-5 py-4 text-left font-semibold text-gray-700">Weightage</th>
                  <th className="px-5 py-4 text-left font-semibold text-gray-700">Status</th>
                  <th className="px-5 py-4 text-right font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {goals.map((goal) => (
                  <tr key={goal.id} className="hover:bg-gray-50/80 transition-colors">
                    {/* Goal Info */}
                    <td className="px-5 py-4">
                      <div className="font-semibold text-gray-900 leading-tight mb-1">
                        {goal.title}
                        {goal.isShared && <span className="ml-2 badge bg-purple-100 text-purple-700">KPI</span>}
                      </div>
                      <div className="text-xs text-gray-500 font-medium">{goal.thrustArea}</div>
                      <div className="text-xs text-gray-400 mt-1">{goal.uom}</div>
                      {goal.progressStatus && (
                        <span className={`inline-block mt-2 px-2 py-0.5 rounded text-[11px] font-semibold tracking-wide uppercase ${PROGRESS_BADGE[goal.progressStatus] || 'bg-gray-100'}`}>
                          {goal.progressStatus}
                        </span>
                      )}
                    </td>

                    {/* Planned Target */}
                    <td className="px-5 py-4 text-gray-900 font-medium">
                      {goal.uom === 'TIMELINE' ? formatTimelineDate(goal.target) : goal.target || '—'}
                    </td>

                    {/* Achievement & Score */}
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

                    {/* Weightage */}
                    <td className="px-5 py-4">
                      <span className="badge bg-blue-50 text-blue-700 border border-blue-200">
                        {goal.weightage}%
                      </span>
                    </td>

                    {/* Approval Status */}
                    <td className="px-5 py-4">
                      <span className={`badge border ${STATUS_BADGE[goal.status] || STATUS_BADGE['DRAFT']}`}>
                        {goal.status || 'DRAFT'} {goal.isLocked && '🔒'}
                      </span>
                      {goal.statusUpdatedBy && (
                        <div className="text-xs text-gray-500 mt-1">
                          By: <span className="font-medium text-gray-700">{goal.statusUpdatedBy}</span>
                        </div>
                      )}
                    </td>

                    {/* Actions & Manager Comments */}
                    <td className="px-5 py-4 text-right">
                      <div className="flex flex-col items-end gap-2">
                        {goal.status === 'APPROVED' && (!goal.isShared || goal.ownerId === user.uid) && activePhase === 'CHECKIN' && (
                          <Link to={`/goals/${goal.id}/checkin`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary-600 hover:text-primary-800 transition-colors">
                            <CheckCircle2 size={14} /> Check In
                          </Link>
                        )}
                        {(goal.status === 'DRAFT' || goal.status === 'REWORK' || (goal.isShared && goal.status === 'APPROVED')) && activePhase === 'SETTING' && (
                          <Link to={`/goals/${goal.id}/edit`} className="inline-flex items-center gap-1.5 text-xs font-semibold text-orange-600 hover:text-orange-800 transition-colors">
                            <Edit3 size={14} /> Edit
                          </Link>
                        )}
                        {(goal.status === 'DRAFT' || goal.status === 'REWORK') && activePhase === 'SETTING' && (
                          <button 
                            onClick={() => submitGoal(goal.id)}
                            className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors mt-1"
                          >
                            <Send size={14} /> Submit
                          </button>
                        )}
                      </div>
                      
                      {/* Manager Comment Banner aligned right */}
                      {goal.managerComment && (
                        <div className="mt-3 p-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-left inline-block max-w-[220px]">
                          <div className="flex items-center gap-1.5 mb-1 text-indigo-800 font-semibold text-xs">
                            <MessageSquare size={12} /> Manager Note
                          </div>
                          <p className="text-xs text-indigo-700 line-clamp-3 leading-relaxed">
                            "{goal.managerComment}"
                          </p>
                        </div>
                      )}
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

export default EmployeeDashboard;
