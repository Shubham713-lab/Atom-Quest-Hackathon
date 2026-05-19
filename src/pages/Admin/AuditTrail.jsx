import { useState, useEffect } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { FileText } from 'lucide-react';

const AuditTrail = () => {
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      setLoading(true);
      const auditSnap = await getDocs(collection(db, 'auditLogs'));
      const auditData = [];
      auditSnap.forEach(doc => {
        auditData.push({ id: doc.id, ...doc.data() });
      });
      // Sort client side (to avoid missing index errors during hackathon)
      auditData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      setAuditLogs(auditData);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-4 text-gray-500 animate-pulse">Loading audit logs...</div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-2xl font-bold text-gray-800">Audit Trail</h2>
      </div>

      <div className="bg-white shadow-sm rounded-xl overflow-hidden border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <FileText size={20} className="text-gray-500" />
              System Audit Trail
            </h3>
            <p className="text-sm text-gray-500 mt-1">Immutable log of critical system actions (status changes, unlocking, inline edits).</p>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Timestamp</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Action Type</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Goal ID</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">User ID</th>
                <th className="px-6 py-3 text-left font-medium text-gray-500">Details</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 text-gray-500 whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 font-medium text-gray-900">
                    {log.action === 'ADMIN_UNLOCK' && <span className="text-red-600">Admin Unlock</span>}
                    {log.action === 'STATUS_CHANGED' && <span className="text-blue-600">Status Change</span>}
                    {log.action === 'INLINE_EDIT' && <span className="text-orange-600">Inline Edit</span>}
                    {log.action === 'EMPLOYEE_WEIGHTAGE_ADJUST' && <span className="text-purple-600">Weightage Adjusted</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{log.goalId}</td>
                  <td className="px-6 py-4 text-gray-500 font-mono text-xs">{log.userId}</td>
                  <td className="px-6 py-4 text-gray-500">
                    {log.action === 'STATUS_CHANGED' && `Changed from ${log.oldValue || '—'} to ${log.newValue}`}
                    {log.action === 'EMPLOYEE_WEIGHTAGE_ADJUST' && 'Employee altered weightage of shared KPI'}
                  </td>
                </tr>
              ))}
              {auditLogs.length === 0 && (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">No audit logs found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AuditTrail;
