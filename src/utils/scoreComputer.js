/**
 * Computes a progress score (0–100) based on UoM type and calculation type.
 *
 * @param {Object} goal - The goal object
 * @param {number|string} achievement - The actual achievement value entered by the employee
 * @returns {number} score - A value from 0 to 100
 */
export function computeScore(goal, achievement) {
  const { uom, calculationType, target } = goal;

  if (!achievement && achievement !== 0) return 0;

  try {
    if (uom === 'ZERO_BASED') {
      // Zero = success (e.g., safety incidents)
      return parseFloat(achievement) === 0 ? 100 : 0;
    }

    if (uom === 'TIMELINE') {
      // Date-based: completion date vs target deadline
      const achievedDate = new Date(achievement);
      const targetDate = new Date(target);
      if (isNaN(achievedDate) || isNaN(targetDate)) return 0;
      return achievedDate <= targetDate ? 100 : 0;
    }

    // For PERCENTAGE and NUMERIC, use calculationType
    const ach = parseFloat(achievement);
    const tgt = parseFloat(target);

    if (isNaN(ach) || isNaN(tgt) || tgt === 0) return 0;

    if (calculationType === 'MAX') {
      // Lower is better (e.g., TAT, Cost)
      const raw = (tgt / ach) * 100;
      return Math.min(100, Math.round(raw));
    } else {
      // MIN (default): Higher is better (e.g., Sales Revenue)
      const raw = (ach / tgt) * 100;
      return Math.min(100, Math.round(raw));
    }
  } catch {
    return 0;
  }
}

/**
 * Returns a human-readable label for the computation method.
 */
export function getScoreLabel(uom, calculationType) {
  if (uom === 'ZERO_BASED') return 'Zero-Based (0 = 100%)';
  if (uom === 'TIMELINE') return 'Timeline (On/Before Deadline = 100%)';
  if (calculationType === 'MAX') return 'Lower is Better (Target ÷ Achievement)';
  return 'Higher is Better (Achievement ÷ Target)';
}
