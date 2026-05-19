import { collection, getDocs, addDoc, query, where } from 'firebase/firestore';
import { db } from '../config/firebase';

/**
 * Runs the Rule-Based Escalation Scan.
 * This simulates a daily cron job for the hackathon demo.
 * 
 * @param {Array} users - All users in the system
 * @param {Array} goals - All goals in the system
 * @param {String} activePhase - The current active phase (e.g. 'Phase 1: Goal Setting')
 * @returns {Object} - Results of the scan
 */
export const runEscalationScan = async (users, goals, activePhase) => {
  let newEscalationsCount = 0;

  try {
    // 1. Fetch existing unresolved escalations to avoid duplicates
    const escalationsRef = collection(db, 'escalations');
    const q = query(escalationsRef, where('status', '==', 'ACTIVE'));
    const existingSnap = await getDocs(q);
    const existingKeys = new Set();
    existingSnap.forEach(doc => {
      const data = doc.data();
      existingKeys.add(`${data.userId}-${data.ruleType}`);
    });

    const employees = users.filter(u => u.role === 'EMPLOYEE');
    
    // Evaluate rules for each employee
    for (const emp of employees) {
      const empGoals = goals.filter(g => g.employeeId === emp.id);

      // RULE 1: Employee hasn't submitted goals in Phase 1
      if (activePhase.includes('Phase 1')) {
        const hasSubmittedOrApproved = empGoals.some(g => g.status === 'SUBMITTED' || g.status === 'APPROVED');
        if (!hasSubmittedOrApproved) {
          const key = `${emp.id}-MISSING_SUBMISSION`;
          if (!existingKeys.has(key)) {
            await createEscalation({
              userId: emp.id,
              userName: emp.name,
              userEmail: emp.email,
              ruleType: 'MISSING_SUBMISSION',
              level: 'Level 1 (Employee Alert)',
              reason: 'Employee has not submitted any goals during the Goal Setting phase.',
              targetRole: 'EMPLOYEE'
            });
            newEscalationsCount++;
            existingKeys.add(key);
          }
        }
      }

      // RULE 2: Manager hasn't approved goals
      const pendingApprovalGoals = empGoals.filter(g => g.status === 'SUBMITTED');
      if (pendingApprovalGoals.length > 0) {
        // Find if any are older than N days (for hackathon, we just trigger immediately if it exists)
        const key = `${emp.id}-PENDING_MANAGER_APPROVAL`;
        if (!existingKeys.has(key)) {
          await createEscalation({
            userId: emp.id, // Targeting the employee's goals, but the action is on the manager
            userName: emp.name, // The employee waiting
            userEmail: emp.email,
            ruleType: 'PENDING_MANAGER_APPROVAL',
            level: 'Level 2 (Manager Alert)',
            reason: `Manager has pending approvals for ${emp.name}'s goals.`,
            targetRole: 'MANAGER'
          });
          newEscalationsCount++;
          existingKeys.add(key);
        }
      }

      // RULE 3: Check-in missing during active check-in window
      if (activePhase.includes('Check-in') || activePhase.includes('Annual')) {
        const approvedGoals = empGoals.filter(g => g.status === 'APPROVED');
        const missingCheckins = approvedGoals.some(g => g.achievement === undefined || g.achievement === null || g.achievement === '');
        
        if (approvedGoals.length > 0 && missingCheckins) {
          const key = `${emp.id}-MISSING_CHECKIN`;
          if (!existingKeys.has(key)) {
            await createEscalation({
              userId: emp.id,
              userName: emp.name,
              userEmail: emp.email,
              ruleType: 'MISSING_CHECKIN',
              level: 'Level 1 (Employee Alert)',
              reason: `Employee has not logged achievements during the ${activePhase} window.`,
              targetRole: 'EMPLOYEE'
            });
            newEscalationsCount++;
            existingKeys.add(key);
          }
        }
      }
    }

    return { success: true, newEscalationsCount };
  } catch (error) {
    console.error("Escalation Scan Error:", error);
    return { success: false, error: error.message };
  }
};

const createEscalation = async (data) => {
  await addDoc(collection(db, 'escalations'), {
    ...data,
    status: 'ACTIVE', // ACTIVE or RESOLVED
    createdAt: new Date().toISOString(),
  });
};
