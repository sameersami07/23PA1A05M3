# Notification System Design

Campus notification platform for students receiving real-time updates on **Placements**, **Events**, and **Results**.

---

## Stage 1 — REST API Design & Real-Time Contract

### Core Actions

| Action | Description |
|--------|-------------|
| List notifications | Paginated feed for logged-in student |
| Get notification | Fetch single notification by ID |
| Mark as read | Mark one notification read |
| Mark all as read | Bulk read for inbox zero |
| Unread count | Badge count for navbar |
| Priority inbox | Top N unread by type + recency |
| Subscribe (real-time) | Push new notifications to client |

### REST Endpoints

#### 1. List Notifications

```
GET /api/v1/students/{studentId}/notifications
Authorization: Bearer <access_token>
```

**Query params:** `page` (default 1), `limit` (default 20), `type` (Placement|Result|Event), `isRead` (true|false)

**Response 200:**
```json
{
  "data": [
    {
      "id": "d146095a-0d86-4a34-9e69-3900a14576bc",
      "studentId": 1042,
      "type": "Result",
      "message": "mid-sem results published",
      "isRead": false,
      "createdAt": "2026-04-22T17:51:30Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 142 }
}
```

#### 2. Get Notification

```
GET /api/v1/notifications/{notificationId}
Authorization: Bearer <access_token>
```

**Response 200:** Single notification object (same schema as list item).

#### 3. Mark as Read

```
PATCH /api/v1/notifications/{notificationId}/read
Authorization: Bearer <access_token>
Content-Type: application/json
```

**Request:**
```json
{ "isRead": true }
```

**Response 200:**
```json
{ "id": "...", "isRead": true, "readAt": "2026-04-22T18:00:00Z" }
```

#### 4. Mark All as Read

```
POST /api/v1/students/{studentId}/notifications/read-all
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{ "updatedCount": 37 }
```

#### 5. Unread Count

```
GET /api/v1/students/{studentId}/notifications/unread-count
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{ "count": 12 }
```

#### 6. Priority Inbox (Top N)

```
GET /api/v1/students/{studentId}/notifications/priority-inbox?n=10
Authorization: Bearer <access_token>
```

**Response 200:**
```json
{
  "requestedTopN": 10,
  "inbox": [
    {
      "id": "...",
      "type": "Placement",
      "message": "CSX Corporation hiring",
      "createdAt": "2026-04-22T17:51:18Z",
      "priorityRank": 3
    }
  ]
}
```

### JSON Schema (Notification)

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| id | UUID string | yes | Primary key |
| studentId | integer | yes | Recipient |
| type | enum | yes | Placement, Result, Event |
| message | string | yes | Display text |
| isRead | boolean | yes | Default false |
| createdAt | ISO-8601 datetime | yes | Sort key |
| readAt | ISO-8601 datetime | no | Set when marked read |

### Real-Time Mechanism

Use **WebSockets** (or SSE for one-way push) for live delivery:

```
WS /api/v1/students/{studentId}/notifications/stream
Authorization: Bearer <access_token>   (sent as query param or first frame)
```

**Server → Client event:**
```json
{
  "event": "notification.created",
  "payload": {
    "id": "...",
    "type": "Placement",
    "message": "Amazon hiring drive",
    "createdAt": "2026-04-22T18:05:00Z"
  }
}
```

**Flow:**
1. Student logs in → frontend obtains JWT.
2. Frontend opens WebSocket with JWT.
3. Backend validates token, subscribes connection to `student:{id}` channel (Redis Pub/Sub).
4. When a notification is saved, publisher emits to channel → all connected clients receive it instantly.
5. Fallback: long-polling or 30s cache TTL if WebSocket unavailable.

---

## Stage 2 — Persistent Storage Design

### Database Choice: **PostgreSQL**

**Why PostgreSQL:**
- Strong relational integrity (student ↔ notification FK)
- Excellent indexing (B-tree, partial indexes)
- Mature tooling, ACID transactions for read/unread updates
- JSONB support if metadata grows later
- Handles 5M+ rows with proper indexing

Alternatives considered:
- **MongoDB** — good for flexible schemas but weaker for relational unread queries across students
- **Redis alone** — fast but not durable as primary store

### Schema

```sql
CREATE TABLE students (
    id          BIGSERIAL PRIMARY KEY,
    email       VARCHAR(255) UNIQUE NOT NULL,
    name        VARCHAR(255) NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TYPE notification_type AS ENUM ('Placement', 'Result', 'Event');

CREATE TABLE notifications (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    student_id   BIGINT NOT NULL REFERENCES students(id),
    type         notification_type NOT NULL,
    message      TEXT NOT NULL,
    is_read      BOOLEAN NOT NULL DEFAULT FALSE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at      TIMESTAMPTZ
);

CREATE INDEX idx_notifications_student_unread
    ON notifications (student_id, created_at DESC)
    WHERE is_read = FALSE;

CREATE INDEX idx_notifications_student_type_created
    ON notifications (student_id, type, created_at DESC);
```

### Queries (Stage 1 APIs)

**List paginated notifications:**
```sql
SELECT id, student_id, type, message, is_read, created_at, read_at
FROM notifications
WHERE student_id = $1
  AND ($2::notification_type IS NULL OR type = $2)
  AND ($3::boolean IS NULL OR is_read = $3)
ORDER BY created_at DESC
LIMIT $4 OFFSET $5;
```

**Mark as read:**
```sql
UPDATE notifications
SET is_read = TRUE, read_at = NOW()
WHERE id = $1 AND student_id = $2;
```

**Unread count:**
```sql
SELECT COUNT(*) FROM notifications
WHERE student_id = $1 AND is_read = FALSE;
```

### Scaling Problems & Solutions

| Problem | Solution |
|---------|----------|
| Table scan on 5M rows | Composite partial index on `(student_id, created_at DESC) WHERE is_read = false` |
| Hot student rows | Connection pooling (PgBouncer), read replicas |
| Write spikes (Notify All) | Async queue (Kafka/RabbitMQ) + batch inserts |
| Large message payloads | Store body in object storage, keep reference in DB |
| Archival | Partition by month; move read notifications > 90 days to cold storage |

---

## Stage 3 — Query Performance Analysis

### Existing Query

```sql
SELECT *
FROM notifications
WHERE studentID = 1042
  AND isRead = false
ORDER BY createdAt DESC;
```

### 1. Is this query accurate?

**Mostly yes** for fetching unread notifications for one student, but:
- `SELECT *` returns unnecessary columns (e.g., large metadata)
- Column naming should be consistent (`student_id`, `is_read`, `created_at`)
- No `LIMIT` — returns all unread rows (could be thousands)

### 2. Why is it slow at 5M notifications?

- **Full table scan** if no suitable index exists (5M rows scanned)
- **Sort cost** — sorting all matching unread rows by `createdAt DESC`
- **Wide rows** — `SELECT *` increases I/O
- **Buffer cache pressure** — cold data evicts hot pages

With 50K students averaging 100 unread each → potentially millions of unread rows globally, but only ~100–500 per student. Without index on `(studentID, isRead, createdAt)`, Postgres cannot narrow quickly.

### 3. What would you change?

```sql
SELECT id, type, message, created_at
FROM notifications
WHERE student_id = 1042
  AND is_read = FALSE
ORDER BY created_at DESC
LIMIT 50;
```

**Add index:**
```sql
CREATE INDEX idx_notif_student_unread_created
ON notifications (student_id, created_at DESC)
WHERE is_read = FALSE;
```

### 4. Likely computation cost

With proper partial index:
- **Index seek** on `student_id` → O(log N) B-tree lookup
- **Range scan** of that student's unread entries → O(k) where k = unread count (~100–500)
- **Sort** — avoided if index provides `created_at DESC` order
- **Total:** ~O(log N + k) — milliseconds

Without index:
- **Seq scan** 5M rows → O(N) — hundreds of ms to seconds

### 5. Index every column?

**No — ineffective and harmful.**

- Indexes have write/maintenance overhead on every INSERT/UPDATE
- Query planner may choose wrong index (index intersection poor on many indexes)
- Low-cardinality columns (`isRead` alone) don't help alone
- **Best practice:** composite indexes matching **WHERE + ORDER BY** columns

### 6. Students who received Placement notification in last 7 days

```sql
SELECT DISTINCT student_id
FROM notifications
WHERE type = 'Placement'
  AND created_at >= NOW() - INTERVAL '7 days';
```

With index:
```sql
CREATE INDEX idx_notif_type_created ON notifications (type, created_at DESC);
```

---

## Stage 4 — Caching & Performance

### Problem

Fetching notifications on **every page load** overwhelms the DB (50K students × multiple pages × repeated identical queries).

### Solution: Multi-Layer Cache

```
Client → API Gateway → Redis Cache → PostgreSQL (on miss)
```

| Layer | Strategy | TTL |
|-------|----------|-----|
| **Browser** | Cache unread count + last fetched page | 30s |
| **Redis** | Key: `inbox:{studentId}:unread` → sorted set of notification IDs | 60s |
| **CDN** | Not for personalized data | — |
| **DB** | Read replica for list queries | — |

**Cache-aside pattern:**
1. `GET inbox` → check Redis key `inbox:1042:page:1`
2. On hit → return cached JSON
3. On miss → query DB, store in Redis with TTL
4. On `mark read` → invalidate `inbox:1042:*` and decrement unread counter

**WebSocket for push:** After first load, new notifications arrive via WebSocket — no polling needed.

### Trade-offs

| Approach | Pros | Cons |
|----------|------|------|
| Redis cache | Sub-ms reads, reduces DB load 90%+ | Stale data within TTL; invalidation complexity |
| No cache | Always fresh | DB melts under load |
| Long TTL (5 min) | Maximum DB savings | User sees delayed unread badge |
| Write-through cache | Strong consistency | Slower writes |

**Recommended:** 60s TTL for list + instant invalidation on read/mark-read + WebSocket for new items.

---

## Stage 5 — Notify All Redesign

### Original Pseudocode Shortcomings

```text
function notify_all(student_ids, message):
    for student_id in student_ids:
        send_email(student_id, message)
        save_to_db(student_id, message)
        push_to_app(student_id, message)
```

| Issue | Impact |
|-------|--------|
| **Synchronous sequential loop** | 50K × (email + DB + push) = hours of blocking |
| **No retry** | 200 email failures = lost notifications |
| **No idempotency** | Re-run duplicates emails/notifications |
| **Tight coupling** | Email failure could block DB save (if in same try block) |
| **No backpressure** | SMTP/DB rate limits cause cascading failure |
| **Single thread** | Cannot scale horizontally |

### If send_email fails for 200 students midway?

- **200 students** never got email — but DB/push may or may not have run depending on error handling
- **No dead-letter queue** — failures are lost
- **No resume** — must manually identify failed IDs
- **Partial state** — inconsistent across channels

### Should DB save and email happen together?

**No — use eventual consistency with outbox pattern.**

| Together (same transaction) | Separate (recommended) |
|-----------------------------|------------------------|
| Email delay blocks DB commit | DB commit is fast and durable |
| Email provider down = no notification record | Notification always saved; email retried async |
| Hard to retry one channel | Each channel has independent retry policy |

**Flow:**
1. **Write** notification rows to DB in batches (bulk insert, 1000 rows/transaction)
2. **Publish** events to message queue per student
3. **Workers** consume: email worker, push worker (independent retry + DLQ)

### Revised Pseudocode

```text
function notify_all(student_ids, message, type):
    batches = chunk(student_ids, 1000)

    for batch in batches:
        notifications = []
        for student_id in batch:
            notifications.append({student_id, message, type, status: "pending"})

        db.bulk_insert(notifications)          # durable first
        queue.publish("notification.created", notifications)

    return { accepted: len(student_ids), status: "queued" }


# Email worker (async, retriable)
function email_worker(event):
    for item in event:
        try:
            send_email(item.student_id, item.message)
            metrics.increment("email.success")
        catch err:
            if item.retry_count < 5:
                queue.retry(item, backoff=exponential)
            else:
                dead_letter_queue.push(item)
                metrics.increment("email.failed")


# Push worker (async)
function push_worker(event):
    for item in event:
        push_to_app(item.student_id, item.message)
        redis.publish("student:" + item.student_id, item)
```

**Benefits:** Non-blocking HR action, retries, idempotency keys, horizontal scaling, partial failure isolation.

---

## Stage 6 — Priority Inbox Implementation

### Requirements Recap

- Top N unread notifications (N = 10, 15, 20…)
- Priority: **Placement > Result > Event**, then **recency**
- Implemented in `notification-app-be/priority/inbox.go`

### Scoring Formula

```
score = (type_rank × 10^12) + unix_timestamp
```

Where `type_rank`: Placement=3, Result=2, Event=1.

This ensures type dominates, and within the same type newer notifications rank higher.

### API (Local Service)

```
GET http://localhost:8081/api/notifications/priority-inbox?n=10
GET http://localhost:8081/api/notifications/sync?n=15
```

Fetches from evaluation-service `/notifications` (Bearer auth), ranks, returns top N.

### Keeping Top N Updated Efficiently

Use a **min-heap of size N**:

1. For each incoming notification, compute score.
2. If heap size < N → push.
3. If heap size = N and new score > min(heap) → pop min, push new.
4. **Complexity:** O(log N) per insert vs O(M log M) full re-sort on every fetch.

For production at scale:
- **Redis Sorted Set** (`ZADD inbox:{studentId} score notificationId`) — O(log N) insert, O(log N + N) top-N fetch
- On new notification via WebSocket, update sorted set and push delta to client
- Periodic full sync only on reconnect

### Example Output (Top 3)

```json
{
  "count": 3,
  "requestedTopN": 3,
  "inbox": [
    { "notification": { "ID": "...", "Type": "Placement", "Message": "CSX Corporation hiring" }, "typeRank": 3 },
    { "notification": { "ID": "...", "Type": "Placement", "Message": "Google hiring" }, "typeRank": 3 },
    { "notification": { "ID": "...", "Type": "Result", "Message": "mid-sem" }, "typeRank": 2 }
  ]
}
```

See `notification-app-be/output/` and `vehicle-scheduler-be/output/` for sample run outputs.
