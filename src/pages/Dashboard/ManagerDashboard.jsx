import { useState, useEffect, useContext } from 'react';
import { collection, getDocs, doc, updateDoc, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';
import { CheckCircle, XCircle, Edit, Save, RefreshCw, MessageSquare, X } from 'lucide-react';

const STATUS_BADGE = {
  APPROVED: 'bg-green-100 text-green-800',
  REWORK: 'bg-orange-100 text-orange-800',
  REJECTED: 'bg-red-100 text-red-800',
  SUBMITTED: 'bg-yellow-100 text-yellow-800',
  DRAFT: 'bg-gray-100 text-gray-800',
};
const PROGRESS_BADGE = {
  'Completed': 'bg-green-100 text-green-800',
  'On Track': 'bg-blue-100 text-blue-800',
  'Not Started': 'bg-gray-100 text-gray-600',
};

const ManagerDashboard = () => {
  const { user } = useContext(AuthContext);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedGoals, setSelectedGoals] = useState([]);

  // Inline edit state
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ target: '', weightage: 0 });

  // Comment modal state
  const [commentGoal, setCommentGoal] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [savingComment, setSavingComment] = useState(false);

  useEffect(() => {
    fetchGoals();
  }, []);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const goalsRef = collection(db, 'goals');
      const querySnapshot = await getDocs(goalsRef);
      const goalsData = [];
      querySnapshot.forEach((d) => {
        goalsData.push({ id: d.id, ...d.data() });
      });
      setGoals(goalsData);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to fetch goals');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (goalId, newStatus, oldStatus) => {
    try {
      const goalRef = doc(db, 'goals', goalId);
      await updateDoc(goalRef, {
        status: newStatus,
        isLocked: newStatus === 'APPROVED',
        statusUpdatedAt: new Date().toISOString(),
        statusUpdatedBy: user.name || 'Manager',
        updatedAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'auditLogs'), {
        goalId, action: 'STATUS_CHANGED', oldValue: oldStatus, newValue: newStatus,
        userId: user.uid, createdAt: new Date().toISOString()
      });
      
      const goal = goals.find(g => g.id === goalId);
      if (goal && (newStatus === 'APPROVED' || newStatus === 'REJECTED' || newStatus === 'REWORK')) {
        await addDoc(collection(db, 'notifications'), {
          targetUserId: goal.employeeId,
          type: newStatus === 'APPROVED' ? 'APPROVAL' : 'REJECTION',
          message: `Your goal "${goal.title}" was marked as ${newStatus} by your manager.`,
          isRead: false,
          createdAt: new Date().toISOString()
        });
      }

      setGoals(goals.map(g => g.id === goalId ? { ...g, status: newStatus, isLocked: newStatus === 'APPROVED' } : g));
    } catch {
      alert('Failed to update status');
    }
  };

  const handleBulkApprove = async () => {
    if (!window.confirm(`Are you sure you want to approve ${selectedGoals.length} goals?`)) return;
    
    try {
      setLoading(true);
      const updates = selectedGoals.map(async (goalId) => {
        const goalRef = doc(db, 'goals', goalId);
        await updateDoc(goalRef, {
          status: 'APPROVED',
          isLocked: true,
          statusUpdatedAt: new Date().toISOString(),
          statusUpdatedBy: user.name || 'Manager',
          updatedAt: new Date().toISOString()
        });
        await addDoc(collection(db, 'auditLogs'), {
          goalId, action: 'STATUS_CHANGED', oldValue: 'SUBMITTED', newValue: 'APPROVED',
          userId: user.uid, createdAt: new Date().toISOString()
        });

        const goal = goals.find(g => g.id === goalId);
        if (goal) {
          await addDoc(collection(db, 'notifications'), {
            targetUserId: goal.employeeId,
            type: 'APPROVAL',
            message: `Your goal "${goal.title}" was APPROVED via manager bulk action.`,
            isRead: false,
            createdAt: new Date().toISOString()
          });
        }
      });
      await Promise.all(updates);
      setGoals(goals.map(g => selectedGoals.includes(g.id) ? { ...g, status: 'APPROVED', isLocked: true } : g));
      setSelectedGoals([]);
      alert(`Successfully approved ${selectedGoals.length} goals.`);
    } catch (err) {
      alert('Failed to bulk approve goals');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const submittableIds = goals.filter(g => g.status === 'SUBMITTED').map(g => g.id);
      setSelectedGoals(submittableIds);
    } else {
      setSelectedGoals([]);
    }
  };

  const toggleSelection = (id) => {
    if (selectedGoals.includes(id)) {
      setSelectedGoals(selectedGoals.filter(gid => gid !== id));
    } else {
      setSelectedGoals([...selectedGoals, id]);
    }
  };

  const startEdit = (goal) => {
    setEditingId(goal.id);
    setEditForm({ target: goal.target || '', weightage: goal.weightage });
  };

  const saveEdit = async (goal) => {
    try {
      const goalRef = doc(db, 'goals', goal.id);
      await updateDoc(goalRef, {
        target: editForm.target,
        weightage: parseInt(editForm.weightage),
        updatedAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'auditLogs'), {
        goalId: goal.id, action: 'INLINE_EDIT',
        userId: user.uid, createdAt: new Date().toISOString()
      });
      setGoals(goals.map(g => g.id === goal.id ? { ...g, target: editForm.target, weightage: parseInt(editForm.weightage) } : g));
      setEditingId(null);
    } catch {
      alert('Failed to save edits');
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

  if (loading) return <div className="p-4 text-gray-500">Loading dashboard...</div>;
  if (error) return <div className="p-4 text-red-500">{error}</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Team Goals & Check-in Review</h2>
        {selectedGoals.length > 0 && (
          <button 
            onClick={handleBulkApprove}
            className="btn-primary"
          >
            <CheckCircle size={18} />
            Approve Selected ({selectedGoals.length})
          </button>
        )}
      </div>

      <div className="bg-white shadow-sm rounded-xl overflow-x-auto border border-gray-200">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left w-12">
                <input 
                  type="checkbox" 
                  onChange={handleSelectAll}
                  checked={goals.filter(g => g.status === 'SUBMITTED').length > 0 && selectedGoals.length === goals.filter(g => g.status === 'SUBMITTED').length}
                  disabled={goals.filter(g => g.status === 'SUBMITTED').length === 0}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Goal / Thrust Area</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Planned Target</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actual Achievement</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Progress Score</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {goals.map((goal) => (
              <tr key={goal.id} className={`transition-colors ${selectedGoals.includes(goal.id) ? 'bg-primary-50' : 'hover:bg-gray-50'}`}>
                <td className="px-4 py-4">
                  <input 
                    type="checkbox"
                    checked={selectedGoals.includes(goal.id)}
                    onChange={() => toggleSelection(goal.id)}
                    disabled={goal.status !== 'SUBMITTED'}
                    className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                </td>
                <td className="px-4 py-4">
                  <div className="font-medium text-gray-900 flex items-center gap-1">
                    {goal.title}
                    {goal.isShared && <span className="text-xs bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded">Shared</span>}
                    {goal.isLocked && <span className="text-xs text-gray-400">🔒</span>}
                  </div>
                  <div className="text-xs text-gray-500">{goal.thrustArea}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{goal.uom} · {goal.calculationType === 'MAX' ? 'Lower is Better' : goal.uom === 'ZERO_BASED' ? 'Zero=100%' : goal.uom === 'TIMELINE' ? 'Date Based' : 'Higher is Better'}</div>
                  {goal.progressStatus && (
                    <span className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full font-medium ${PROGRESS_BADGE[goal.progressStatus] || 'bg-gray-100 text-gray-600'}`}>
                      {goal.progressStatus}
                    </span>
                  )}
                </td>

                {/* Planned Target — inline editable */}
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  {editingId === goal.id ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="text"
                        value={editForm.target}
                        onChange={(e) => setEditForm({ ...editForm, target: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1 w-24 text-sm"
                      />
                    </div>
                  ) : (
                    <span className="font-medium text-gray-900">{goal.target || '—'}</span>
                  )}
                  {editingId === goal.id && (
                    <div className="mt-1 flex items-center gap-1">
                      <input
                        type="number"
                        value={editForm.weightage}
                        onChange={(e) => setEditForm({ ...editForm, weightage: e.target.value })}
                        className="border border-gray-300 rounded px-2 py-1 w-16 text-sm"
                      />
                      <span className="text-xs text-gray-500">%</span>
                    </div>
                  )}
                  {editingId !== goal.id && <div className="text-xs text-gray-400">{goal.weightage}% weight</div>}
                </td>

                {/* Actual Achievement */}
                <td className="px-4 py-4 whitespace-nowrap text-sm">
                  {goal.achievement !== undefined && goal.achievement !== '' ? (
                    <span className="font-semibold text-gray-900">
                      {goal.achievement}
                      {goal.uom === 'PERCENTAGE' ? '%' : ''}
                    </span>
                  ) : (
                    <span className="text-gray-400 italic">Not logged yet</span>
                  )}
                </td>

                {/* Computed Progress Score */}
                <td className="px-4 py-4 whitespace-nowrap">
                  {goal.computedScore !== undefined && goal.computedScore !== null ? (
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className={`h-2 rounded-full ${goal.computedScore >= 80 ? 'bg-green-500' : goal.computedScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                            style={{ width: `${goal.computedScore}%` }}
                          />
                        </div>
                        <span className={`text-xs font-bold ${goal.computedScore >= 80 ? 'text-green-700' : goal.computedScore >= 50 ? 'text-yellow-700' : 'text-red-700'}`}>
                          {goal.computedScore}%
                        </span>
                      </div>
                      {goal.managerComment && (
                        <p className="text-xs text-indigo-600 mt-1 flex items-center gap-1">
                          <MessageSquare size={10} /> Comment added
                        </p>
                      )}
                    </div>
                  ) : (
                    <span className="text-gray-400 text-xs italic">Pending</span>
                  )}
                </td>

                {/* Status */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[goal.status] || STATUS_BADGE['DRAFT']}`}>
                    {goal.status || 'DRAFT'}
                  </span>
                </td>

                {/* Actions */}
                <td className="px-4 py-4 whitespace-nowrap">
                  <div className="flex gap-1.5 flex-wrap">
                    {editingId === goal.id ? (
                      <button onClick={() => saveEdit(goal)} className="text-blue-600 bg-blue-50 p-1.5 rounded-md" title="Save"><Save size={16} /></button>
                    ) : (
                      <button onClick={() => startEdit(goal)} disabled={goal.isLocked} className="text-blue-600 bg-blue-50 p-1.5 rounded-md disabled:opacity-40" title="Edit Target/Weightage"><Edit size={16} /></button>
                    )}
                    <button onClick={() => handleStatusUpdate(goal.id, 'APPROVED', goal.status)} className="text-green-600 bg-green-50 p-1.5 rounded-md" title="Approve"><CheckCircle size={16} /></button>
                    <button onClick={() => handleStatusUpdate(goal.id, 'REWORK', goal.status)} className="text-orange-600 bg-orange-50 p-1.5 rounded-md" title="Return for Rework"><RefreshCw size={16} /></button>
                    <button onClick={() => handleStatusUpdate(goal.id, 'REJECTED', goal.status)} className="text-red-600 bg-red-50 p-1.5 rounded-md" title="Reject"><XCircle size={16} /></button>
                    <button onClick={() => openCommentModal(goal)} className="text-indigo-600 bg-indigo-50 p-1.5 rounded-md" title="Add Manager Comment"><MessageSquare size={16} /></button>
                  </div>
                </td>
              </tr>
            ))}
            {goals.length === 0 && (
              <tr>
                <td colSpan="6" className="px-6 py-8 text-center text-gray-500">No team goals found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Manager Comment Modal */}
      {commentGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 mx-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Manager Check-in Comment</h3>
                <p className="text-sm text-gray-500">{commentGoal.title}</p>
              </div>
              <button onClick={() => setCommentGoal(null)} className="text-gray-400 hover:text-gray-600 p-1">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4 grid grid-cols-2 gap-3 p-3 bg-gray-50 rounded-lg text-sm">
              <div><span className="text-gray-500">Planned Target:</span><br /><strong>{commentGoal.target || '—'}</strong></div>
              <div><span className="text-gray-500">Actual Achievement:</span><br /><strong>{commentGoal.achievement ?? 'Not logged'}</strong></div>
              <div><span className="text-gray-500">Progress Score:</span><br /><strong className={commentGoal.computedScore >= 80 ? 'text-green-700' : commentGoal.computedScore >= 50 ? 'text-yellow-700' : 'text-red-700'}>{commentGoal.computedScore ?? 0}%</strong></div>
              <div><span className="text-gray-500">Progress Status:</span><br /><strong>{commentGoal.progressStatus || 'N/A'}</strong></div>
            </div>

            <textarea
              rows={5}
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-indigo-500 focus:border-indigo-500 text-sm"
              placeholder="Document your check-in discussion notes, observations, and guidance for this employee..."
            />

            <div className="flex justify-end gap-3 mt-4">
              <button onClick={() => setCommentGoal(null)} className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm">Cancel</button>
              <button
                onClick={saveComment}
                disabled={savingComment || !commentText.trim()}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-40 text-sm"
              >
                {savingComment ? 'Saving...' : 'Save Comment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;
