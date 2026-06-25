/**
 * 0/1 Knapsack — maximize impact within mechanic-hour budget.
 * Time: O(n * capacity), Space: O(capacity)
 */
function solveKnapsack(items, capacity) {
  if (capacity <= 0 || items.length === 0) {
    return { totalImpact: 0, totalDuration: 0, selected: [] };
  }

  const n = items.length;
  const prev = Array(capacity + 1).fill(0);
  const curr = Array(capacity + 1).fill(0);
  const keep = Array.from({ length: n }, () => Array(capacity + 1).fill(false));

  for (let i = 0; i < n; i += 1) {
    const weight = items[i].duration;
    const value = items[i].impact;
    curr.fill(0);
    for (let c = 0; c <= capacity; c += 1) {
      curr[c] = prev[c];
    }
    for (let c = weight; c <= capacity; c += 1) {
      if (prev[c - weight] + value > curr[c]) {
        curr[c] = prev[c - weight] + value;
        keep[i][c] = true;
      }
    }
    for (let c = 0; c <= capacity; c += 1) {
      prev[c] = curr[c];
    }
  }

  const selected = [];
  let cap = capacity;
  for (let i = n - 1; i >= 0; i -= 1) {
    if (keep[i][cap]) {
      selected.push(items[i]);
      cap -= items[i].duration;
    }
  }

  selected.sort((a, b) => a.index - b.index);
  const totalDuration = selected.reduce((sum, item) => sum + item.duration, 0);

  return {
    totalImpact: prev[capacity],
    totalDuration,
    selected,
  };
}

function scheduleDepots(depots, vehicles) {
  const sortedDepots = [...depots].sort((a, b) => a.ID - b.ID);
  let remaining = vehicles.map((vehicle, index) => ({
    index,
    taskID: vehicle.TaskID,
    duration: vehicle.Duration,
    impact: vehicle.Impact,
  }));

  const report = {
    depotSchedules: [],
    grandTotalImpact: 0,
    tasksScheduled: 0,
    tasksRemaining: 0,
  };

  for (const depot of sortedDepots) {
    const result = solveKnapsack(remaining, depot.MechanicHours);
    const used = new Set(result.selected.map((item) => item.index));

    report.depotSchedules.push({
      depotID: depot.ID,
      mechanicHours: depot.MechanicHours,
      totalImpact: result.totalImpact,
      totalDuration: result.totalDuration,
      selectedTasks: result.selected.map((item) => item.taskID),
    });

    report.grandTotalImpact += result.totalImpact;
    report.tasksScheduled += result.selected.length;
    remaining = remaining.filter((item) => !used.has(item.index));
  }

  report.tasksRemaining = remaining.length;
  return report;
}

module.exports = { solveKnapsack, scheduleDepots };
