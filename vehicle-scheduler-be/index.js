require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const { LogSafe, credentialsFromEnv, credentialsValid } = require('logging-middleware');
const { EvaluationClient } = require('./src/client/evaluationClient');
const { scheduleDepots } = require('./src/scheduler/knapsack');
const { mockData } = require('./src/mockData');

function printReport(report) {
  console.log('=== Vehicle Maintenance Scheduler ===');
  console.log(`Grand Total Impact: ${report.grandTotalImpact}`);
  console.log(`Tasks Scheduled:    ${report.tasksScheduled}`);
  console.log(`Tasks Remaining:    ${report.tasksRemaining}\n`);

  for (const depot of report.depotSchedules) {
    console.log(`Depot ${depot.depotID} (budget: ${depot.mechanicHours}h)`);
    console.log(`  Impact:   ${depot.totalImpact}`);
    console.log(`  Duration: ${depot.totalDuration}h`);
    console.log(`  Tasks (${depot.selectedTasks.length}):`);
    for (const taskId of depot.selectedTasks) {
      console.log(`    - ${taskId}`);
    }
    console.log('');
  }
}

async function main() {
  const creds = credentialsFromEnv();
  const useMock = process.env.USE_MOCK_DATA === 'true' || !credentialsValid(creds);

  let depots;
  let vehicles;

  if (useMock) {
    console.log('Using mock data (set evaluation credentials to call live APIs)');
    ({ depots, vehicles } = mockData());
  } else {
    LogSafe('backend', 'info', 'service', 'vehicle scheduler started');
    const client = new EvaluationClient(creds);
    depots = await client.getDepots();
    vehicles = await client.getVehicles();
    LogSafe(
      'backend',
      'info',
      'service',
      `fetched ${depots.length} depots and ${vehicles.length} vehicles`
    );
  }

  const report = scheduleDepots(depots, vehicles);
  printReport(report);

  const outputFile = process.env.OUTPUT_FILE;
  if (outputFile) {
    const outputPath = path.resolve(__dirname, outputFile);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`Report written to ${outputPath}`);
  }

  if (!useMock) {
    LogSafe(
      'backend',
      'info',
      'service',
      `scheduling complete: impact=${report.grandTotalImpact} tasks=${report.tasksScheduled}`
    );
  }
}

main().catch((err) => {
  LogSafe('backend', 'error', 'service', err.message);
  console.error(err.message);
  process.exit(1);
});
