import { useState, useEffect, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { doc, getDoc, updateDoc, collection, query, where, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';
import { AlertCircle, Lock } from 'lucide-react';
import { getCurrentWindow } from '../../utils/timeWindows';

const UOM_OPTIONS = [
  { value: 'PERCENTAGE', label: 'Percentage (%)' },
  { value: 'NUMERIC', label: 'Numeric Value' },
  { value: 'TIMELINE', label: 'Timeline / Milestone' },
  { value: 'ZERO_BASED', label: 'Zero-Based (e.g., Safety Incidents)' },
];

const EditGoal = () => {
  const { id } = useParams();
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

  const [goal, setGoal] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentTotal, setCurrentTotal] = useState(0);

  useEffect(() => {
    const fetchData = async () => {
      // Phase Guard
      if (getCurrentWindow().activePhase !== 'SETTING') {
        navigate('/');
        return;
      }

      if (!user?.uid) return;
      try {
        const goalRef = doc(db, 'goals', id);
        const goalSnap = await getDoc(goalRef);

        if (!goalSnap.exists() || goalSnap.data().employeeId !== user.uid) {
          setError('Goal not found or you are not authorized to edit it.');
          setLoading(false);
          return;
        }

        const data = goalSnap.data();

        // Block edits on locked goals that aren't shared KPIs (where only weightage is allowed)
        if (data.isLocked && !(data.isShared && data.ownerId !== user.uid)) {
          setError('This goal is locked after approval. Contact your admin to unlock it.');
          setLoading(false);
          return;
        }

        setGoal({ id: goalSnap.id, ...data });
        setFormData({
          title: data.title || '',
          description: data.description || '',
          thrustArea: data.thrustArea || '',
          target: data.target || '',
          weightage: data.weightage || 10,
          uom: data.uom || 'PERCENTAGE',
          calculationType: data.calculationType || 'MIN',
        });

        // Fetch total weightage excluding this goal
        const q = query(collection(db, 'goals'), where('employeeId', '==', user.uid));
        const snap = await getDocs(q);
        let total = 0;
        snap.forEach((d) => { if (d.id !== id) total += d.data().weightage; });
        setCurrentTotal(total);
      } catch (err) {
        setError(err.message || 'Failed to load goal');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id, user]);

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

    if (formData.weightage < 10) {
      setError('Minimum weightage per goal is 10%.');
      return;
    }
    if (currentTotal + formData.weightage > 100) {
      setError(`Total weightage would exceed 100%. You have ${currentTotal}% on other goals — max available is ${100 - currentTotal}%.`);
      return;
    }

    try {
      setSubmitting(true);
      const goalRef = doc(db, 'goals', id);
      const isSharedRecipient = goal.isShared && goal.ownerId !== user.uid;

      // Recipients of shared KPIs may ONLY update weightage
      const updateData = isSharedRecipient
        ? { weightage: formData.weightage, updatedAt: new Date().toISOString() }
        : { ...formData, updatedAt: new Date().toISOString() };

      await updateDoc(goalRef, updateData);

      // Audit Log for Shared Goal edits
      if (isSharedRecipient) {
        await addDoc(collection(db, 'auditLogs'), {
          goalId: id,
          action: 'EMPLOYEE_WEIGHTAGE_ADJUST',
          userId: user.uid,
          createdAt: new Date().toISOString()
        });
      }

      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to update goal');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-16">
        <div className="w-8 h-8 border-4 border-primary-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!goal) {
    return (
      <div className="max-w-2xl mx-auto mt-8 p-6 bg-red-50 rounded-xl border border-red-200 flex items-center gap-3 text-red-700">
        <AlertCircle className="shrink-0 w-5 h-5" />
        <span>{error}</span>
      </div>
    );
  }

  const isSharedRecipient = goal.isShared && goal.ownerId !== user.uid;

  return (
    <div className="max-w-2xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="mb-8 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900">
          {isSharedRecipient ? 'Adjust KPI Weightage' : 'Edit Goal'}
        </h2>
        {isSharedRecipient && (
          <div className="mt-2 flex items-center gap-2 text-sm text-orange-700 bg-orange-50 border border-orange-200 p-3 rounded-lg">
            <Lock size={14} />
            This is a Shared Departmental KPI. Only the <strong>Weightage</strong> can be adjusted.
          </div>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 flex items-start gap-3 rounded-lg border border-red-200 text-red-700 text-sm">
          <AlertCircle className="shrink-0 w-5 h-5 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title <span className="text-red-500">*</span></label>
          <input type="text" name="title" required disabled={isSharedRecipient}
            value={formData.title} onChange={handleChange} className="input" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thrust Area <span className="text-red-500">*</span></label>
            <input type="text" name="thrustArea" required disabled={isSharedRecipient}
              value={formData.thrustArea} onChange={handleChange} className="input" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Value <span className="text-red-500">*</span></label>
            <input type="text" name="target" required disabled={isSharedRecipient}
              value={formData.target} onChange={handleChange} className="input" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" rows={3} disabled={isSharedRecipient}
            value={formData.description} onChange={handleChange} className="input" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Weightage (%) <span className="text-red-500">*</span></label>
            <input type="number" name="weightage" min="10" max={100 - currentTotal}
              required value={formData.weightage} onChange={handleChange} className="input" />
            <p className="text-xs text-gray-500 mt-1">Available: {100 - currentTotal}%</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measurement</label>
            <select name="uom" disabled={isSharedRecipient} value={formData.uom}
              onChange={handleChange} className="input">
              {UOM_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </div>
        </div>

        {/* Calculation Type — only for numeric/percentage, only if not shared recipient */}
        {!isSharedRecipient && (formData.uom === 'PERCENTAGE' || formData.uom === 'NUMERIC') && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Calculation Type</label>
            <select name="calculationType" value={formData.calculationType}
              onChange={handleChange} className="input md:w-1/2">
              <option value="MIN">Higher is Better (Achievement ÷ Target)</option>
              <option value="MAX">Lower is Better (Target ÷ Achievement)</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.calculationType === 'MIN' ? 'Score = (Achievement ÷ Target) × 100' : 'Score = (Target ÷ Achievement) × 100'}
            </p>
          </div>
        )}

        <div className="pt-6 border-t flex justify-end gap-3">
          <button type="button" onClick={() => navigate('/')} className="btn-secondary">Cancel</button>
          <button type="submit" disabled={submitting} className="btn-primary">
            {submitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditGoal;
