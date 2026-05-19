/**
 * Utility to determine the current phase of the Goal Setting & Tracking cycle.
 * Includes a Dev Override mechanism for hackathon demonstration.
 */

// Mapping of JS Month Index (0-11) to Phase
// 0 = Jan, 1 = Feb, 2 = Mar, ..., 11 = Dec
const MONTH_PHASE_MAP = {
  0: { phase: 'CHECKIN', name: 'Q3 Check-in', desc: 'Progress Update — Planned vs. Actual' },
  1: { phase: 'CLOSED', name: 'Closed', desc: 'System in Read-Only Mode' },
  2: { phase: 'CHECKIN', name: 'Q4 / Annual', desc: 'Final Achievement Capture' },
  3: { phase: 'CHECKIN', name: 'Q4 / Annual', desc: 'Final Achievement Capture' },
  4: { phase: 'SETTING', name: 'Phase 1 — Goal Setting', desc: 'Goal Creation, Submission & Approval' },
  5: { phase: 'CLOSED', name: 'Closed', desc: 'System in Read-Only Mode' },
  6: { phase: 'CHECKIN', name: 'Q1 Check-in', desc: 'Progress Update — Planned vs. Actual' },
  7: { phase: 'CLOSED', name: 'Closed', desc: 'System in Read-Only Mode' },
  8: { phase: 'CLOSED', name: 'Closed', desc: 'System in Read-Only Mode' },
  9: { phase: 'CHECKIN', name: 'Q2 Check-in', desc: 'Progress Update — Planned vs. Actual' },
  10: { phase: 'CLOSED', name: 'Closed', desc: 'System in Read-Only Mode' },
  11: { phase: 'CLOSED', name: 'Closed', desc: 'System in Read-Only Mode' },
};

/**
 * Gets the current active window phase.
 * Respects the 'dev_mock_month' localStorage item if set.
 */
export const getCurrentWindow = () => {
  const mockMonth = localStorage.getItem('dev_mock_month');
  
  let currentMonth;
  if (mockMonth !== null && mockMonth !== undefined && mockMonth !== '') {
    currentMonth = parseInt(mockMonth, 10);
  } else {
    currentMonth = new Date().getMonth(); // 0-11
  }

  const windowData = MONTH_PHASE_MAP[currentMonth] || MONTH_PHASE_MAP[1]; // default closed

  return {
    monthIndex: currentMonth,
    activePhase: windowData.phase, // 'SETTING', 'CHECKIN', 'CLOSED'
    windowName: windowData.name,
    description: windowData.desc
  };
};

/**
 * For Dev/Admin use: Set the mock month
 * @param {number|null} monthIndex 0-11, or null to clear
 */
export const setMockMonth = (monthIndex) => {
  if (monthIndex === null || monthIndex === undefined) {
    localStorage.removeItem('dev_mock_month');
  } else {
    localStorage.setItem('dev_mock_month', monthIndex.toString());
  }
};
