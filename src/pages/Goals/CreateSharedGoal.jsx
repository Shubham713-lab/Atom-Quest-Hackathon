import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, getDocs, addDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AlertCircle, Users } from 'lucide-react';

const CreateSharedGoal = () => {
  const navigate = useNavigate();
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    thrustArea: '',
    description: '',
    target: '',
    uom: 'PERCENTAGE',
    ownerId: '',
    sharedWithIds: [], // Array of employee UIDs
  });

  useEffect(() => {
    const fetchEmployees = async () => {
      const usersSnap = await getDocs(collection(db, 'users'));
      const usersData = [];
      usersSnap.forEach(doc => {
        if (doc.data().role === 'EMPLOYEE') {
          usersData.push({ id: doc.id, ...doc.data() });
        }
      });
      setEmployees(usersData);
    };
    fetchEmployees();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckbox = (id) => {
    setFormData(prev => {
      const isSelected = prev.sharedWithIds.includes(id);
      return {
        ...prev,
        sharedWithIds: isSelected 
          ? prev.sharedWithIds.filter(uid => uid !== id)
          : [...prev.sharedWithIds, id]
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.ownerId) {
      setError('Please select a primary owner for achievement updates.');
      return;
    }
    if (formData.sharedWithIds.length === 0) {
      setError('Please select at least one employee to share this goal with.');
      return;
    }

    try {
      setLoading(true);

      // Create Parent Goal for the Owner
      const parentGoalData = {
        title: formData.title,
        thrustArea: formData.thrustArea,
        description: formData.description,
        target: formData.target,
        uom: formData.uom,
        weightage: 10, // Default minimum weightage, they must adjust it
        progress: 0,
        status: 'APPROVED', // Usually shared KPIs are pre-approved
        isLocked: true,
        isShared: true,
        employeeId: formData.ownerId,
        ownerId: formData.ownerId,
        createdAt: new Date().toISOString()
      };

      const parentDocRef = await addDoc(collection(db, 'goals'), parentGoalData);

      // Distribute to selected employees
      for (const empId of formData.sharedWithIds) {
        if (empId !== formData.ownerId) {
          await addDoc(collection(db, 'goals'), {
            ...parentGoalData,
            employeeId: empId,
            parentGoalId: parentDocRef.id,
            ownerId: formData.ownerId,
            // The linked goals copy the data but wait for owner updates
          });
        }
      }

      navigate('/');
    } catch (err) {
      setError(err.message || 'Failed to push shared goal');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded-xl shadow-sm border border-gray-100">
      <div className="mb-8 border-b pb-4">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Users className="text-primary-600" />
          Push Departmental KPI (Shared Goal)
        </h2>
        <p className="text-gray-500 mt-1">
          Deploy a common goal to multiple employees. The primary owner will be responsible for updating the progress, which will sync across all linked sheets.
        </p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 flex items-start gap-3 rounded-md border border-red-200 text-red-700">
          <AlertCircle className="shrink-0 w-5 h-5 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Goal Title *</label>
            <input type="text" name="title" required value={formData.title} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Thrust Area *</label>
            <input type="text" name="thrustArea" required value={formData.thrustArea} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target *</label>
            <input type="text" name="target" required value={formData.target} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Unit of Measurement</label>
            <select name="uom" value={formData.uom} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500">
              <option value="PERCENTAGE">Percentage (%)</option>
              <option value="NUMERIC">Numeric Value</option>
              <option value="TIMELINE">Timeline / Milestone</option>
              <option value="ZERO_BASED">Zero-Based</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <textarea name="description" rows={3} value={formData.description} onChange={handleChange} className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500" />
        </div>

        <div className="border-t pt-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Distribution Settings</h3>
          
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">Primary Owner (Responsible for updates) *</label>
            <select name="ownerId" required value={formData.ownerId} onChange={handleChange} className="w-full md:w-1/2 px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500">
              <option value="">-- Select Owner --</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Share With (Recipients) *</label>
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 max-h-60 overflow-y-auto">
              {employees.map(emp => (
                <label key={emp.id} className="flex items-center gap-3 p-2 hover:bg-gray-100 rounded cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-primary-600 rounded border-gray-300 focus:ring-primary-500"
                    checked={formData.sharedWithIds.includes(emp.id)}
                    onChange={() => handleCheckbox(emp.id)}
                  />
                  <span className="text-sm font-medium text-gray-900">{emp.name}</span>
                  <span className="text-sm text-gray-500">({emp.email})</span>
                  {formData.ownerId === emp.id && <span className="ml-auto text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">Owner</span>}
                </label>
              ))}
              {employees.length === 0 && <p className="text-sm text-gray-500">No employees found.</p>}
            </div>
          </div>
        </div>

        <div className="pt-6 border-t flex justify-end gap-4">
          <button type="button" onClick={() => navigate('/')} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">Cancel</button>
          <button type="submit" disabled={loading} className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:bg-primary-400">
            {loading ? 'Pushing...' : 'Deploy Shared Goal'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateSharedGoal;
