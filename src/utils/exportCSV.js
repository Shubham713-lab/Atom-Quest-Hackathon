/**
 * Generates and downloads a CSV file for the Achievement Report
 * @param {Array} goals - Array of all goals
 * @param {Array} users - Array of all users
 */
export const exportAchievementReport = (goals, users) => {
  // Create a user map for easy lookup
  const userMap = {};
  users.forEach(u => {
    userMap[u.id] = u;
  });

  // Define CSV headers
  const headers = [
    'Employee Name',
    'Email',
    'Goal Title',
    'Thrust Area',
    'UoM',
    'Planned Target',
    'Actual Achievement',
    'Progress Score (%)',
    'Status',
    'Is Locked',
    'Is Shared KPI',
    'Manager Comment'
  ];

  // Map goals to CSV rows
  const rows = goals.map(goal => {
    const employee = userMap[goal.employeeId] || { name: 'Unknown', email: 'N/A' };
    
    return [
      `"${employee.name}"`,
      `"${employee.email}"`,
      `"${goal.title.replace(/"/g, '""')}"`, // Escape quotes
      `"${goal.thrustArea || ''}"`,
      `"${goal.uom || ''}"`,
      `"${goal.target || ''}"`,
      `"${goal.achievement !== undefined && goal.achievement !== null ? goal.achievement : 'Not Logged'}"`,
      `"${goal.computedScore !== undefined && goal.computedScore !== null ? goal.computedScore : 'N/A'}"`,
      `"${goal.status || 'DRAFT'}"`,
      `"${goal.isLocked ? 'Yes' : 'No'}"`,
      `"${goal.isShared ? 'Yes' : 'No'}"`,
      `"${(goal.managerComment || '').replace(/"/g, '""')}"` // Escape quotes
    ];
  });

  // Combine headers and rows
  const csvContent = [
    headers.join(','),
    ...rows.map(r => r.join(','))
  ].join('\n');

  // Create a Blob and trigger download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `Achievement_Report_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
