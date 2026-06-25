# Campus Evaluation Backend (23PA1A05M3)

Node.js / Express monorepo for the AffordMed campus evaluation backend track.

## Projects

| Folder | Description |
|--------|-------------|
| `logging-middleware/` | Reusable `Log()` + auth for evaluation APIs |
| `vehicle-scheduler-be/` | 0/1 knapsack vehicle maintenance scheduler |
| `notification-app-be/` | Express API with Priority Inbox (Stage 6) |
| `notification_system_design.md` | Stages 1–5 design document |

## Quick Start

1. Copy `.env.example` to `.env` and fill in your evaluation credentials
2. Install each project:

```bash
cd logging-middleware && npm install
cd ../vehicle-scheduler-be && npm install
cd ../notification-app-be && npm install
```

3. Run vehicle scheduler:

```bash
cd vehicle-scheduler-be
npm start
```

4. Run notification app:

```bash
cd notification-app-be
npm start
```

Use `USE_MOCK_DATA=true` in `.env` to run without live API credentials.

## Tech Stack

- **Runtime:** Node.js 18+
- **Framework:** Express 4
- **Auth:** Bearer token via `/evaluation-service/auth`
