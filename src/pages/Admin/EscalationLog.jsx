import { useState, useEffect } from 'react';
import { collection, getDocs, doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { AlertTriangle, ShieldAlert, CheckCircle2, PlayCircle, Clock } from 'lucide-react';
import { getCurrentWindow } from '../../utils/timeWindows';
import { runEscalationScan } from '../../utils/escalationEngine';

const EscalationLog = () => {
  const [escalations, setEscalations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  // We need users and goals for the scan
  const [users, setUsers] = useState([]);
  const [goals, setGoals] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [escSnap, usersSnap, goalsSnap] = await Promise.all([
        getDocs(collection(db, 'escalations')),
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'goals'))
      ]);
      
      const escData = [];
      escSnap.forEach(d => escData.push({ id: d.id, ...d.data() }));
      escData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setEscalations(escData);

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

  const handleRunScan = async () => {
    setScanning(true);
    const activePhase = getCurrentWindow().activePhase;
    
    const result = await runEscalationScan(users, goals, activePhase);
    
    setScanning(false);
    
    if (result.success) {
      if (result.newEscalationsCount > 0) {
        alert(`Scan complete. Generated ${result.newEscalationsCount} new escalation alert(s).`);
        fetchData(); // Refresh the table
      } else {
        alert('Scan complete. No new escalations triggered.');
      }
    } else {
      alert(`Scan failed: ${result.error}`);
    }
  };

  const handleResolve = async (id) => {
    try {
      await updateDoc(doc(db, 'escalations', id), {
        status: 'RESOLVED',
        resolvedAt: new Date().toISOString()
      });
      // Update local state
      setEscalations(escalations.map(e => e.id === id ? { ...e, status: 'RESOLVED' } : e));
    } catch (err) {
      alert('Failed to resolve escalation.');
    }
  };

  if (loading) return <div className="p-4 text-gray-500 animate-pulse">Loading escalation data...</div>;

  const activeEscalations = escalations.filter(e => e.status === 'ACTIVE');
  const resolvedEscalations = escalations.filter(e => e.status === 'RESOLVED');

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-2">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Rule-Based Escalation Engine</h2>
          <p className="text-sm text-gray-500 mt-1">Monitor SLA breaches for goal submissions, approvals, and check-ins.</p>
        </div>
        <button
          onClick={handleRunScan}
          disabled={scanning}
          className="btn-primary flex items-center gap-2 bg-red-600 hover:bg-red-700 disabled:opacity-50"
        >
          {scanning ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <PlayCircle size={18} />}
          Run Escalation Scan
        </button>
      </div>

      {/* Info Banner for Hackathon */}
      <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-xl flex items-start gap-3">
        <Clock className="shrink-0 mt-0.5" size={20} />
        <div className="text-sm">
          <strong>How this works:</strong> In a production environment, this engine would run automatically every midnight via a Firebase Cron job. For this demo, clicking <strong>"Run Escalation Scan"</strong> manually evaluates all user records against the current Phase and instantly generates the alerts.
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-50 text-red-600 rounded-lg"><AlertTriangle size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Active Escalations</p>
            <p className="text-2xl font-bold text-gray-900">{activeEscalations.length}</p>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg"><CheckCircle2 size={24} /></div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Resolved Cases</p>
            <p className="text-2xl font-bold text-gray-900">{resolvedEscalations.length}</p>
          </div>
        </div>
      </div>

      {/* Active Escalations Table */}
      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-red-50/30 flex items-center gap-2">
          <ShieldAlert size={18} className="text-red-600" />
          <h3 className="text-lg font-medium text-gray-900">Action Required (Active Alerts)</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trigger Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User / Department</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Escalation Detail</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Severity Level</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {activeEscalations.length > 0 ? activeEscalations.map((esc) => (
                <tr key={esc.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(esc.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{esc.userName}</div>
                    <div className="text-xs text-gray-500">{esc.userEmail}</div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-800">
                    {esc.reason}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`badge ${esc.level.includes('Manager') ? 'bg-orange-100 text-orange-800' : 'bg-yellow-100 text-yellow-800'}`}>
                      {esc.level}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleResolve(esc.id)}
                      className="text-sm font-medium text-primary-600 hover:text-primary-800 px-3 py-1 bg-primary-50 rounded hover:bg-primary-100 transition-colors"
                    >
                      Mark Resolved
                    </button>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500 italic">No active escalations. Everything is on track!</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Show small list of resolved */}
      {resolvedEscalations.length > 0 && (
        <div className="mt-8">
          <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 px-1">Recently Resolved</h4>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {resolvedEscalations.slice(0, 5).map(esc => (
              <div key={esc.id} className="px-4 py-3 border-b border-gray-100 last:border-0 flex justify-between items-center bg-gray-50/50">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-gray-700 line-through opacity-70">{esc.reason} ({esc.userName})</span>
                </div>
                <span className="text-xs text-green-600 flex items-center gap-1"><CheckCircle2 size={12}/> Resolved</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
};

export default EscalationLog;
