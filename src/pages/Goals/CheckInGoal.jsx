import { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, addDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';
import { computeScore, getScoreLabel } from '../../utils/scoreComputer';
import { AlertCircle, TrendingUp } from 'lucide-react';
import { getCurrentWindow } from '../../utils/timeWindows';

const PROGRESS_STATUSES = ['Not Started', 'On Track', 'Completed'];

const CheckInGoal = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  
  const [goal, setGoal] = useState(null);
  const [achievement, setAchievement] = useState('');
  const [progressStatus, setProgressStatus] = useState('On Track');
  const [notes, setNotes] = useState('');
  const [previewScore, setPreviewScore] = useState(null);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    // Phase Guard
    if (getCurrentWindow().activePhase !== 'CHECKIN') {
      navigate('/');
      return;
    }

    const fetchGoal = async () => {
      try {
        const goalRef = doc(db, 'goals', id);
        const goalSnap = await getDoc(goalRef);
        
        if (goalSnap.exists() && goalSnap.data().employeeId === user.uid) {
          const data = goalSnap.data();
          setGoal({ id: goalSnap.id, ...data });
          setAchievement(data.achievement || '');
          setProgressStatus(data.progressStatus || 'On Track');
        } else {
          setError('Goal not found or unauthorized');
        }
      } catch (err) {
        setError('Failed to load goal');
      } finally {
        setLoading(false);
      }
    };
    
    if (user?.uid) fetchGoal();
  }, [id, user]);

  // Live preview the computed score as user types
  useEffect(() => {
    if (goal && achievement !== '') {
      const score = computeScore(goal, achievement);
      setPreviewScore(score);
    } else {
      setPreviewScore(null);
    }
  }, [achievement, goal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      setSubmitting(true);
      
      const finalScore = computeScore(goal, achievement);

      // Add a check-in record
      await addDoc(collection(db, 'checkIns'), {
        goalId: id,
        achievement,
        progressStatus,
        computedScore: finalScore,
        notes,
        userId: user.uid,
        createdAt: new Date().toISOString()
      });

      // Update the main goal document
      const goalRef = doc(db, 'goals', id);
      await updateDoc(goalRef, {
        achievement,
        progressStatus,
        computedScore: finalScore,
        // Keep progress as the score percentage for bar display
        progress: finalScore,
        updatedAt: new Date().toISOString()
      });

      // Notify Managers
      await addDoc(collection(db, 'notifications'), {
        targetRole: 'MANAGER',
        type: 'CHECKIN',
        message: `${user.name || 'An employee'} logged an achievement check-in for goal "${goal.title}".`,
        isRead: false,
        createdAt: new Date().toISOString()
      });

      // SYNC ACHIEVEMENTS: If this is a shared goal and user is the primary owner
      if (goal.isShared && goal.ownerId === user.uid) {
        const parentId = goal.parentGoalId || goal.id;
        const goalsRef = collection(db, 'goals');
        const q = query(goalsRef, where('parentGoalId', '==', parentId));
        const snap = await getDocs(q);
        
        const batch = writeBatch(db);
        snap.forEach(d => {
          if (d.id !== id) {
            batch.update(d.ref, {
              achievement,
              progressStatus,
              computedScore: finalScore,
              progress: finalScore,
              updatedAt: new Date().toISOString()
            });
          }
        });
        await batch.commit();
      }

      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to submit check-in');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8 text-gray-500">Loading goal data...</div>;
  if (!goal) return <div className="p-8 text-red-500">{error}</div>;

  const scoreColor = previewScore === null ? 'gray' : previewScore >= 80 ? 'green' : previewScore >= 50 ? 'yellow' : 'red';
  const scoreColorMap = {
    gray: 'bg-gray-200 text-gray-700',
    green: 'bg-green-100 text-green-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    red: 'bg-red-100 text-red-800',
  };
  const barColorMap = {
    gray: 'bg-gray-400',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
    red: 'bg-red-500',
  };

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="mb-8 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <TrendingUp className="text-primary-600" />
          Quarterly Check-In
        </h2>
        <p className="text-gray-500 mt-1">Log your achievement for: <strong>{goal.title}</strong></p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 flex items-start gap-3 rounded-md border border-red-200 text-red-700">
          <AlertCircle className="shrink-0 w-5 h-5 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {/* Goal Details Banner */}
      <div className="mb-6 grid grid-cols-2 gap-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-900">
        <div><strong>Thrust Area:</strong><br />{goal.thrustArea || 'N/A'}</div>
        <div><strong>Planned Target:</strong><br />{goal.target}</div>
        <div><strong>UoM:</strong><br />{goal.uom}</div>
        <div>
          <strong>Score Method:</strong><br />
          <span className="text-xs">{getScoreLabel(goal.uom, goal.calculationType)}</span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Actual Achievement <span className="text-red-500">*</span>
          </label>
          {goal.uom === 'TIMELINE' ? (
            <input
              type="date"
              required
              value={achievement}
              onChange={(e) => setAchievement(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            />
          ) : (
            <div className="relative">
              <input
                type="number"
                required
                min="0"
                value={achievement}
                onChange={(e) => setAchievement(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder={goal.uom === 'ZERO_BASED' ? 'e.g., 0 for success, 1 for failure' : 'Enter actual value'}
              />
              {goal.uom === 'PERCENTAGE' && (
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
                  <span className="text-gray-500 sm:text-sm">%</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Live Score Preview */}
        {previewScore !== null && (
          <div className="p-4 rounded-lg border border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">System-Computed Progress Score</span>
              <span className={`font-bold text-lg px-3 py-0.5 rounded-full ${scoreColorMap[scoreColor]}`}>
                {previewScore}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className={`h-3 rounded-full transition-all ${barColorMap[scoreColor]}`}
                style={{ width: `${previewScore}%` }}
              />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Formula: {getScoreLabel(goal.uom, goal.calculationType)}. Score is capped at 100%.
            </p>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Progress Status <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-3">
            {PROGRESS_STATUSES.map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setProgressStatus(status)}
                className={`flex-1 py-2 px-3 rounded-md text-sm font-medium border transition-colors ${
                  progressStatus === status
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Check-In Notes
          </label>
          <textarea
            rows={4}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
            placeholder="Explain your achievements, blockers, and key highlights this quarter..."
          />
        </div>

        <div className="pt-6 border-t flex justify-end gap-4">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:bg-primary-400"
          >
            {submitting ? 'Submitting...' : 'Submit Check-In'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CheckInGoal;
