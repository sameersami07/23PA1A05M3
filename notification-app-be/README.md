## Notification App Backend (Express)

Campus notification service with **Priority Inbox** (Stage 6).

### Setup

```bash
npm install
cp ../.env.example ../.env
```

### Run

```bash
npm start
```

Server starts at `http://localhost:8081`.

### Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| GET | `/api/notifications/priority-inbox?n=10` | Top N unread by priority |
| GET | `/api/notifications/sync?n=10` | Batch-build priority inbox |

### Priority Rules

1. **Type:** Placement > Result > Event
2. **Recency:** Newer notifications rank higher within the same type

### Example

```bash
curl "http://localhost:8081/api/notifications/priority-inbox?n=3"
```

Use `USE_MOCK_DATA=true` when evaluation credentials are unavailable.

Add screenshots of API responses to the `screenshots/` folder before submission.

### Tests

```bash
npm test
```
