const test = require('node:test');
const assert = require('node:assert/strict');
const { solveKnapsack, scheduleDepots } = require('../src/scheduler/knapsack');

test('solveKnapsack classic example', () => {
  const items = [
    { index: 0, taskID: 'a', duration: 10, impact: 60 },
    { index: 1, taskID: 'b', duration: 20, impact: 100 },
    { index: 2, taskID: 'c', duration: 30, impact: 120 },
  ];
  const result = solveKnapsack(items, 50);
  assert.equal(result.totalImpact, 220);
  assert.equal(result.totalDuration, 50);
});

test('scheduleDepots does not reuse vehicles', () => {
  const depots = [
    { ID: 1, MechanicHours: 6 },
    { ID: 2, MechanicHours: 6 },
  ];
  const vehicles = [
    { TaskID: 'a', Duration: 3, Impact: 10 },
    { TaskID: 'b', Duration: 3, Impact: 9 },
    { TaskID: 'c', Duration: 3, Impact: 8 },
  ];
  const report = scheduleDepots(depots, vehicles);
  assert.ok(report.tasksScheduled <= 3);
});
