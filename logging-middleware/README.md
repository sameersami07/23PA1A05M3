## Logging Middleware

Reusable Node.js logging middleware for the AffordMed evaluation service.

### Setup

```bash
npm install
```

Copy credentials from the repo root `.env.example` into a `.env` file.

### Usage

```javascript
const { Log, LogSafe, getAccessToken } = require('logging-middleware');

await Log('backend', 'info', 'service', 'application started');
LogSafe('backend', 'error', 'handler', 'something failed');
```

### API

| Function | Description |
|----------|-------------|
| `Log(stack, level, package, message)` | Sends a log event to `/evaluation-service/logs` |
| `LogSafe(...)` | Same as `Log`, but never throws |
| `getAccessToken()` | Returns cached Bearer token from `/auth` |

Valid values:
- **stack:** `backend`, `frontend`
- **level:** `debug`, `info`, `warn`, `error`, `fatal`
- **package:** `component`, `handler`, `service`, `middleware`, etc.
