import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { 
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, Legend, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, LineChart, Line
} from 'recharts';
import { PieChart as PieChartIcon, TrendingUp, Users, Target } from 'lucide-react';

const COLORS = ['#0ea5e9', '#22c55e', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const AnalyticsDashboard = () => {
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

  // --- Data Processors ---

  // 1. Goal Distribution by Status
  const getStatusDistribution = () => {
    const counts = goals.reduce((acc, goal) => {
      acc[goal.status] = (acc[goal.status] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  };

  // 2. Goal Distribution by Thrust Area
  const getThrustAreaDistribution = () => {
    const counts = goals.reduce((acc, goal) => {
      const area = goal.thrustArea || 'Unassigned';
      acc[area] = (acc[area] || 0) + 1;
      return acc;
    }, {});
    return Object.keys(counts).map(key => ({ name: key, value: counts[key] }));
  };

  // 3. Manager Effectiveness (Completion Rates)
  const getManagerEffectiveness = () => {
    const managers = users.filter(u => u.role === 'MANAGER' || u.role === 'ADMIN');
    return managers.map(mgr => {
      // Find employees reporting to this manager (for hackathon, everyone if admin, or maybe just team)
      // Since we don't have explicit managerId on employees, we'll approximate by finding goals this manager approved/interacted with
      // Actually, let's just group goals by Employee, then group by a dummy "Manager A, B" for the demo if we lack relations.
      // Wait, we DO have managers! Any user with role MANAGER is a manager. But we don't have direct reports.
      // Let's just generate a mock distribution of effectiveness across the existing managers.
      
      // Let's calculate overall completion rates per department or role instead if manager relation is missing.
      // Let's just group by Employee and use their name for a 'Top Performers' chart.
      return null;
    }).filter(Boolean);
  };

  // Alternative 3: Top Employees by Completion
  const getTopPerformers = () => {
    const employees = users.filter(u => u.role === 'EMPLOYEE');
    return employees.map(emp => {
      const empGoals = goals.filter(g => g.employeeId === emp.id && g.status === 'APPROVED');
      const total = empGoals.length;
      if (total === 0) return null;
      
      const completed = empGoals.filter(g => g.achievement !== undefined && g.achievement !== null && g.achievement !== '').length;
      const completionRate = Math.round((completed / total) * 100);
      
      return {
        name: emp.name.split(' ')[0], // First name
        completionRate,
        totalGoals: total
      };
    }).filter(Boolean).sort((a, b) => b.completionRate - a.completionRate).slice(0, 5); // Top 5
  };

  // 4. QoQ Trend (Simulated for Demo)
  const getSimulatedQoQ = () => {
    // We simulate Q1 to Q4 progression based on average current scores.
    // If average current score is 60%, we map: Q1: 15%, Q2: 35%, Q3: 60%, Q4: 85%
    const scoredGoals = goals.filter(g => g.computedScore !== undefined && g.computedScore !== null);
    let avgScore = 0;
    if (scoredGoals.length > 0) {
      avgScore = scoredGoals.reduce((sum, g) => sum + g.computedScore, 0) / scoredGoals.length;
    } else {
      avgScore = 45; // default fallback for demo
    }

    return [
      { quarter: 'Q1', achievement: Math.round(avgScore * 0.25), target: 25 },
      { quarter: 'Q2', achievement: Math.round(avgScore * 0.55), target: 50 },
      { quarter: 'Q3', achievement: Math.round(avgScore * 0.90), target: 75 },
      { quarter: 'Q4', achievement: Math.round(avgScore * 1.20), target: 100 }, // Projected
    ];
  };

  if (loading) return <div className="p-4 text-gray-500 animate-pulse">Loading analytics...</div>;

  const statusData = getStatusDistribution();
  const thrustData = getThrustAreaDistribution();
  const performersData = getTopPerformers();
  const qoqData = getSimulatedQoQ();

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <PieChartIcon className="text-primary-600" />
            Analytics & Insights
          </h2>
          <p className="text-sm text-gray-500 mt-1">Macro-level performance indicators and goal distribution.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Target size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Total Goals Tracked</p>
            <p className="text-2xl font-bold text-gray-900">{goals.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg"><TrendingUp size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Avg Achievement Score</p>
            <p className="text-2xl font-bold text-gray-900">
              {goals.filter(g => g.computedScore !== undefined).length > 0 
                ? Math.round(goals.reduce((acc, g) => acc + (g.computedScore || 0), 0) / goals.filter(g => g.computedScore !== undefined).length)
                : 0}%
            </p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-purple-50 text-purple-600 rounded-lg"><Users size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Active Participants</p>
            <p className="text-2xl font-bold text-gray-900">{users.filter(u => u.role === 'EMPLOYEE').length}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* QoQ Trend Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Simulated QoQ Trajectory</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={qoqData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis dataKey="quarter" tick={{fill: '#6b7280'}} axisLine={false} tickLine={false} />
                <YAxis tick={{fill: '#6b7280'}} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <RechartsTooltip 
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: '20px' }} />
                <Line type="monotone" name="Actual / Projected" dataKey="achievement" stroke="#0ea5e9" strokeWidth={3} dot={{r: 6, fill: '#0ea5e9', strokeWidth: 2, stroke: '#fff'}} activeDot={{ r: 8 }} />
                <Line type="monotone" name="Target Baseline" dataKey="target" stroke="#9ca3af" strokeWidth={2} strokeDasharray="5 5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Employee Completion Bar Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-6">Top Employee Completion Rates</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={performersData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#e5e7eb" />
                <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} tick={{fill: '#6b7280'}} axisLine={false} tickLine={false} />
                <YAxis dataKey="name" type="category" tick={{fill: '#374151', fontWeight: 500}} axisLine={false} tickLine={false} width={80} />
                <RechartsTooltip 
                  cursor={{fill: '#f3f4f6'}}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  formatter={(value) => [`${value}%`, 'Completion Rate']}
                />
                <Bar dataKey="completionRate" fill="#22c55e" radius={[0, 4, 4, 0]} barSize={24}>
                  {performersData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Goal Status Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Goal Status Distribution</h3>
          <div className="h-72 flex items-center justify-center">
            {statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 italic">No data available</p>
            )}
          </div>
        </div>

        {/* Thrust Area Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-2">Thrust Area Breakdown</h3>
          <div className="h-72 flex items-center justify-center">
            {thrustData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={thrustData}
                    cx="50%"
                    cy="50%"
                    outerRadius={90}
                    dataKey="value"
                    labelLine={false}
                    label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  >
                    {thrustData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip 
                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-gray-400 italic">No data available</p>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default AnalyticsDashboard;
