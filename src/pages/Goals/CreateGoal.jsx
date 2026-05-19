import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';
import { AlertCircle } from 'lucide-react';
import { getCurrentWindow } from '../../utils/timeWindows';

const UOM_OPTIONS = [
  { value: 'PERCENTAGE', label: 'Percentage (%)' },
  { value: 'NUMERIC', label: 'Numeric Value' },
  { value: 'TIMELINE', label: 'Timeline / Milestone' },
  { value: 'ZERO_BASED', label: 'Zero-Based (e.g., Safety Incidents)' },
];

const CreateGoal = () => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    thrustArea: '',
    target: '',
    weightage: 10,
    uom: 'PERCENTAGE',
    calculationType: 'MIN',
  });

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [fetchingTotal, setFetchingTotal] = useState(true);
  const [currentTotal, setCurrentTotal] = useState(0);
  const [goalCount, setGoalCount] = useState(0);

  useEffect(() => {
    // Phase Guard
    if (getCurrentWindow().activePhase !== 'SETTING') {
      navigate('/');
      return;
    }

    const fetchCurrentGoals = async () => {
      if (!user?.uid) return;
      try {
        const q = query(collection(db, 'goals'), where('employeeId', '==', user.uid));
        const snap = await getDocs(q);
        let total = 0;
        snap.forEach((d) => { total += d.data().weightage; });
        setCurrentTotal(total);
        setGoalCount(snap.size);
      } catch (err) {
        console.error('Failed to load current goals:', err);
      } finally {
        setFetchingTotal(false);
      }
    };
    fetchCurrentGoals();
  }, [user]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === 'weightage' ? parseInt(value) || 0 : value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (goalCount >= 8) {
      setError('You have reached the maximum of 8 goals.');
      return;
    }
    if (formData.weightage < 10) {
      setError('Minimum weightage per goal is 10%.');
      return;
    }
    if (currentTotal + formData.weightage > 100) {
      setError(`This would exceed 100% total weightage. You have ${currentTotal}% used — max you can add is ${100 - currentTotal}%.`);
      return;
    }

    try {
      setLoading(true);
      await addDoc(collection(db, 'goals'), {
        title: formData.title,
        description: formData.description,
        thrustArea: formData.thrustArea,
        target: formData.target,
        weightage: formData.weightage,
        uom: formData.uom,
        calculationType: formData.calculationType,
        // Runtime fields — NOT set at creation
        employeeId: user.uid,
        status: 'DRAFT',
        progress: 0,
        achievement: null,
        progressStatus: 'Not Started',
        computedScore: null,
        isLocked: false,
        isShared: false,
        parentGoalId: null,
        createdAt: new Date().toISOString(),
      });
      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to create goal');
    } finally {
      setLoading(false);
    }
  };

  const available = 100 - currentTotal;

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="mb-8 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">Create New Goal</h2>
        <p className="text-gray-500 mt-1 text-sm">Define your objective and how it will be measured.</p>
      </div>

      {/* Quota bar */}
      {!fetchingTotal && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex justify-between text-xs font-medium text-gray-600 mb-1.5">
            <span>Weightage Used</span>
            <span>{currentTotal}% / 100%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full transition-all ${currentTotal >= 100 ? 'bg-red-500' : 'bg-primary-500'}`}
              style={{ width: `${Math.min(currentTotal, 100)}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-500 mt-1.5">
            <span>Goals: {goalCount}/8</span>
            <span>Available: {available}%</span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-5 p-4 bg-red-50 flex items-start gap-3 rounded-lg border border-red-200 text-red-700 text-sm">
          <AlertCircle className="shrink-0 w-4 h-4 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title <span className="text-red-500">*</span></label>
          <input type="text" name="title" required value={formData.title}
            onChange={handleChange} className="input" placeholder="e.g., Increase quarterly sales revenue" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thrust Area <span className="text-red-500">*</span></label>
            <input type="text" name="thrustArea" required value={formData.thrustArea}
              onChange={handleChange} className="input" placeholder="e.g., Financial, Customer" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Value <span className="text-red-500">*</span></label>
            <input type="text" name="target" required value={formData.target}
              onChange={handleChange} className="input" placeholder="e.g., 100, 2026-06-30, $1M" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" rows={3} value={formData.description}
            onChange={handleChange} className="input resize-none" placeholder="What does success look like?" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weightage (%) <span className="text-red-500">*</span></label>
            <input type="number" name="weightage" min="10" max={available}
              required value={formData.weightage} onChange={handleChange} className="input" />
            <p className="text-xs text-gray-500 mt-1">Min 10% · Available: <strong>{available}%</strong></p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measurement</label>
            <select name="uom" value={formData.uom} onChange={handleChange} className="input">
              {UOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {(formData.uom === 'PERCENTAGE' || formData.uom === 'NUMERIC') && (
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <label className="block text-sm font-medium text-blue-900 mb-2">Calculation Type</label>
            <select name="calculationType" value={formData.calculationType}
              onChange={handleChange} className="input bg-white w-full">
              <option value="MIN">Higher is Better (e.g., Revenue, Output)</option>
              <option value="MAX">Lower is Better (e.g., Cost, TAT, Errors)</option>
            </select>
            <p className="text-xs text-blue-700 mt-2">
              Formula: {formData.calculationType === 'MIN'
                ? 'Score = (Achievement ÷ Target) × 100'
                : 'Score = (Target ÷ Achievement) × 100'
              }
            </p>
          </div>
        )}

        <div className="pt-6 border-t flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={loading || fetchingTotal} className="btn-primary">
            {loading ? 'Creating...' : 'Create Goal'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateGoal;
