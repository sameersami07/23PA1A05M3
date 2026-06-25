## Vehicle Scheduler Backend (Express / Node.js)

Maximises operational impact by solving a **0/1 knapsack** problem for each depot using mechanic-hour budgets fetched from the evaluation API.

### Setup

```bash
npm install
cp ../.env.example ../.env
```

Set your evaluation credentials in `.env`, or use mock data:

```bash
set USE_MOCK_DATA=true
npm start
```

### Run

```bash
npm start
```

Output is printed to the console and optionally saved to `output/schedule_report.json`.

### Algorithm

1. Fetch depots and vehicles from protected evaluation APIs
2. For each depot (sorted by ID), run 0/1 knapsack on remaining vehicles
3. Duration = weight, Impact = value, MechanicHours = capacity
4. Selected vehicles are removed from the pool (no reuse across depots)

Time complexity: **O(n × capacity)** per depot — efficient for real-world inputs.

### Tests

```bash
npm test
```

Add screenshots of console output to the `screenshots/` folder before submission.
