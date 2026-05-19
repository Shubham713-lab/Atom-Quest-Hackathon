import { useState, useEffect, useContext } from 'react';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';
import { CheckCircle, MessageSquare, X } from 'lucide-react';

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

const ManagerApprovedGoals = () => {
  const { user } = useContext(AuthContext);
  const [goals, setGoals] = useState([]);
  const [users, setUsers] = useState({});
  const [loading, setLoading] = useState(true);

  // Comment modal state
  const [commentGoal, setCommentGoal] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch users mapping
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersMap = {};
      usersSnap.forEach(d => {
        usersMap[d.id] = d.data().name || 'Unknown User';
      });
      setUsers(usersMap);

      // Fetch approved goals
      const goalsRef = collection(db, 'goals');
      const q = query(goalsRef, where("status", "==", "APPROVED"));
      const querySnapshot = await getDocs(q);
      const goalsData = [];
      querySnapshot.forEach((d) => {
        goalsData.push({ id: d.id, ...d.data() });
      });

      // Sort by last updated or created
      goalsData.sort((a, b) => {
        const dateA = new Date(a.updatedAt || a.createdAt || 0).getTime();
        const dateB = new Date(b.updatedAt || b.createdAt || 0).getTime();
        return dateB - dateA; // newest first
      });

      setGoals(goalsData);
    } catch (err) {
      console.error('Failed to fetch approved goals', err);
    } finally {
      setLoading(false);
    }
  };

  const openCommentModal = (goal) => {
    setCommentGoal(goal);
    setCommentText(goal.managerComment || '');
  };

  const saveComment = async () => {
    if (!commentGoal || !commentText.trim()) return;
    try {
      setSavingComment(true);
      const goalRef = doc(db, 'goals', commentGoal.id);
      await updateDoc(goalRef, {
        managerComment: commentText.trim(),
        managerCommentBy: user.uid,
        managerCommentAt: new Date().toISOString()
      });
      setGoals(goals.map(g => g.id === commentGoal.id ? { ...g, managerComment: commentText.trim() } : g));
      setCommentGoal(null);
    } catch {
      alert('Failed to save comment');
    } finally {
      setSavingComment(false);
    }
  };

  if (loading) return <div className="p-4 flex justify-center py-20 text-gray-500 animate-pulse">Loading approved goals...</div>;

  const avgScore = goals.filter(g => g.computedScore != null).length > 0
    ? Math.round(goals.reduce((s, g) => s + (g.computedScore ?? 0), 0) / goals.filter(g => g.computedScore != null).length)
    : 0;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <CheckCircle className="text-green-600" size={28} />
            Approved Team Goals
          </h2>
          <p className="text-sm text-gray-500 mt-1">Review locked goals, track check-ins, and provide ongoing feedback.</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
            <span className="text-sm text-gray-500">Total Approved</span>
            <span className="text-lg font-bold text-gray-900">{goals.length}</span>
          </div>
          <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm flex items-center gap-3">
            <span className="text-sm text-gray-500">Avg Score</span>
            <span className={`text-lg font-bold ${avgScore >= 80 ? 'text-green-600' : avgScore >= 50 ? 'text-yellow-600' : 'text-red-600'}`}>
              {avgScore}%
            </span>
          </div>
        </div>
      </div>

      <div className="bg-white shadow-sm rounded-xl overflow-x-auto border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Employee</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Goal & Focus</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planned Target</th>
              <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Check-in Status</th>
              <th className="px-5 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Feedback</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {goals.map((goal) => (
              <tr key={goal.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-4 whitespace-nowrap">
                  <div className="font-semibold text-gray-900">{users[goal.employeeId] || 'Employee'}</div>
                </td>
                
                <td className="px-5 py-4">
                  <div className="font-medium text-gray-900 flex items-center gap-1.5 leading-tight mb-1">
                    {goal.title}
                    {goal.isShared && <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded uppercase font-bold tracking-wider">KPI</span>}
                    <span className="text-xs text-gray-400">🔒</span>
                  </div>
                  <div className="text-xs text-gray-500 mb-1">{goal.thrustArea}</div>
                  {goal.progressStatus && (
                    <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${PROGRESS_BADGE[goal.progressStatus] || 'bg-gray-100 text-gray-600'}`}>
                      {goal.progressStatus}
                    </span>
                  )}
                </td>

                <td className="px-5 py-4 text-sm font-medium text-gray-900">
                  {goal.uom === 'TIMELINE' ? formatTimelineDate(goal.target) : goal.target || '—'}
                  <div className="text-xs text-gray-400 mt-1 font-normal">Weight: {goal.weightage}%</div>
                </td>

                <td className="px-5 py-4">
                  <div className="mb-1 text-sm">
                    <span className="text-gray-500">Actual: </span>
                    {goal.achievement !== undefined && goal.achievement !== '' ? (
                      <span className="font-semibold text-gray-900">
                        {goal.uom === 'TIMELINE' ? formatTimelineDate(goal.achievement) : goal.achievement}
                        {goal.uom === 'PERCENTAGE' ? '%' : ''}
                      </span>
                    ) : (
                      <span className="text-gray-400 italic">Not logged</span>
                    )}
                  </div>
                  
                  {goal.computedScore !== undefined && goal.computedScore !== null && (
                    <div className="mt-2">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs text-gray-500">Score:</span>
                        <span className={`text-xs font-bold ${goal.computedScore >= 80 ? 'text-green-700' : goal.computedScore >= 50 ? 'text-yellow-700' : 'text-red-700'}`}>
                          {goal.computedScore}%
                        </span>
                      </div>
                      <div className="w-24 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${goal.computedScore >= 80 ? 'bg-green-500' : goal.computedScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${goal.computedScore}%` }}
                        />
                      </div>
                    </div>
                  )}
                </td>

                <td className="px-5 py-4 text-right">
                  {goal.managerComment && (
                    <div className="mb-2 p-2 bg-indigo-50 rounded-lg text-left inline-block max-w-[200px] border border-indigo-100">
                      <p className="text-[11px] font-semibold text-indigo-800 mb-0.5 flex items-center gap-1">
                        <MessageSquare size={10} /> Note
                      </p>
                      <p className="text-xs text-indigo-900 line-clamp-2" title={goal.managerComment}>
                        "{goal.managerComment}"
                      </p>
                    </div>
                  )}
                  <div className="flex justify-end">
                    <button 
                      onClick={() => openCommentModal(goal)} 
                      className="text-xs font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-md transition-colors flex items-center gap-1.5"
                    >
                      <MessageSquare size={14} /> {goal.managerComment ? 'Edit' : 'Add Note'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {goals.length === 0 && (
              <tr>
                <td colSpan="5" className="px-6 py-12 text-center">
                  <CheckCircle className="mx-auto h-12 w-12 text-gray-300 mb-3" />
                  <p className="text-gray-500 font-medium">No approved goals found.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Manager Comment Modal */}
      {commentGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-900">Check-in Feedback</h3>
                <p className="text-sm text-gray-500">{users[commentGoal.employeeId]}</p>
              </div>
              <button onClick={() => setCommentGoal(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 text-sm bg-gray-50 p-3 rounded-lg border border-gray-100">
              <p className="font-medium text-gray-900 mb-1">{commentGoal.title}</p>
              <div className="flex justify-between text-gray-500 mt-2">
                <span>Target: <strong className="text-gray-700">{commentGoal.uom === 'TIMELINE' ? formatTimelineDate(commentGoal.target) : commentGoal.target}</strong></span>
                <span>Actual: <strong className="text-gray-700">{commentGoal.uom === 'TIMELINE' ? formatTimelineDate(commentGoal.achievement) : commentGoal.achievement || 'N/A'}</strong></span>
              </div>
            </div>

            <textarea
              rows={4}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="input text-sm resize-none"
              placeholder="Add your feedback, observations, or guidance here..."
              autoFocus
            />

            <div className="flex justify-end gap-3 mt-5">
              <button onClick={() => setCommentGoal(null)} className="btn-secondary text-sm px-4">Cancel</button>
              <button
                onClick={saveComment}
                disabled={savingComment || !commentText.trim()}
                className="btn-primary text-sm px-4"
              >
                {savingComment ? 'Saving...' : 'Save Feedback'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerApprovedGoals;
