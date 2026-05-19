import { useState, useEffect, useContext } from 'react';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AuthContext } from '../../context/AuthContext';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend } from 'recharts';
import { PieChart as PieChartIcon } from 'lucide-react';

const COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
const STATUS_COLORS = {
  'APPROVED': '#10b981',
  'SUBMITTED': '#3b82f6',
  'DRAFT': '#9ca3af',
  'REWORK': '#f59e0b',
  'REJECTED': '#ef4444'
};
const PROGRESS_COLORS = {
  'Completed': '#10b981',
  'On Track': '#3b82f6',
  'Not Started': '#9ca3af'
};

const EmployeeAnalytics = () => {
  const { user } = useContext(AuthContext);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchGoals = async () => {
      try {
        const goalsRef = collection(db, 'goals');
        const q = query(goalsRef, where("employeeId", "==", user.uid));
        const querySnapshot = await getDocs(q);
        const goalsData = [];
        querySnapshot.forEach((doc) => {
          goalsData.push({ id: doc.id, ...doc.data() });
        });
        setGoals(goalsData);
      } catch (err) {
        console.error('Failed to fetch goals for analytics', err);
      } finally {
        setLoading(false);
      }
    };

    if (user?.uid) fetchGoals();
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-10 h-10 border-4 border-primary-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-gray-500 font-medium">Loading analytics...</p>
      </div>
    );
  }

  if (goals.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-xl border border-dashed border-gray-300">
        <PieChartIcon className="mx-auto h-12 w-12 text-gray-300 mb-3" />
        <h3 className="text-base font-semibold text-gray-900">No Analytics Available</h3>
        <p className="mt-1 text-sm text-gray-500">Create goals to see your performance metrics here.</p>
      </div>
    );
  }

  // Data processing for charts
  const thrustAreaCount = {};
  goals.forEach(g => {
    if (g.thrustArea) {
      thrustAreaCount[g.thrustArea] = (thrustAreaCount[g.thrustArea] || 0) + 1;
    }
  });
  const thrustAreaData = Object.keys(thrustAreaCount).map(key => ({
    name: key,
    value: thrustAreaCount[key]
  }));

  const statusCount = {};
  goals.forEach(g => {
    const status = g.status || 'DRAFT';
    statusCount[status] = (statusCount[status] || 0) + 1;
  });
  const statusData = Object.keys(statusCount).map(key => ({
    name: key,
    value: statusCount[key]
  }));

  const progressCount = {};
  const approvedGoals = goals.filter(g => g.status === 'APPROVED');
  approvedGoals.forEach(g => {
    const pStatus = g.progressStatus || 'Not Started';
    progressCount[pStatus] = (progressCount[pStatus] || 0) + 1;
  });
  const progressData = Object.keys(progressCount).map(key => ({
    name: key,
    value: progressCount[key]
  }));

  const avgScore = approvedGoals.filter(g => g.computedScore != null).length > 0
    ? Math.round(approvedGoals.reduce((s, g) => s + (g.computedScore ?? 0), 0) / approvedGoals.filter(g => g.computedScore != null).length)
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2">
            <PieChartIcon className="text-primary-600" size={28} />
            My Analytics
          </h2>
          <p className="text-sm text-gray-500 mt-1">Visualize your goal distribution, approval status, and overall progress.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-4 text-center">Thrust Area Breakdown</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={thrustAreaData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {thrustAreaData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-semibold text-gray-800 mb-4 text-center">Approval Status</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[0]} />
                  ))}
                </Pie>
                <RechartsTooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col items-center justify-center">
          <h3 className="font-semibold text-gray-800 mb-6 text-center">Average Progress Score</h3>
          <div className="relative w-40 h-40 flex items-center justify-center rounded-full border-[12px] border-gray-100 shadow-inner">
            <svg className="absolute inset-0 w-full h-full transform -rotate-90">
              <circle
                cx="50%"
                cy="50%"
                r="44%"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className={avgScore >= 80 ? 'text-green-500' : avgScore >= 50 ? 'text-yellow-500' : 'text-red-500'}
                strokeDasharray={`${avgScore * 2.76} 276`}
                strokeLinecap="round"
              />
            </svg>
            <div className="text-center z-10">
              <span className="text-4xl font-bold text-gray-800">{avgScore}%</span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-6 text-center">Calculated from approved goals with logged check-ins.</p>
        </div>
      </div>

      {approvedGoals.length > 0 && progressData.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 mt-6">
          <h3 className="font-semibold text-gray-800 mb-4 text-center">Check-in Status Overview</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={progressData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <RechartsTooltip cursor={{fill: '#f3f4f6'}} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {progressData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PROGRESS_COLORS[entry.name] || COLORS[0]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeAnalytics;
