require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const express = require('express');
const { LogSafe } = require('logging-middleware');
const { topN, buildInboxFromBatch } = require('./src/priority/inbox');
const { loadNotifications } = require('./src/services/notificationService');

const app = express();
const port = process.env.PORT || 8081;

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/notifications/priority-inbox', async (req, res) => {
  try {
    const requestedTopN = Number.parseInt(req.query.n, 10) || 10;
    const notifications = await loadNotifications();
    const inbox = topN(notifications, requestedTopN);

    res.json({
      count: inbox.length,
      requestedTopN,
      inbox,
    });
  } catch (error) {
    LogSafe('backend', 'error', 'handler', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/notifications/sync', async (req, res) => {
  try {
    const capacity = Number.parseInt(req.query.n, 10) || 10;
    const notifications = await loadNotifications();
    const inbox = buildInboxFromBatch(notifications, capacity);

    res.json({
      capacity,
      inbox: inbox.snapshot(),
    });
  } catch (error) {
    LogSafe('backend', 'error', 'handler', error.message);
    res.status(500).json({ error: error.message });
  }
});

app.listen(port, () => {
  LogSafe('backend', 'info', 'service', `notification app started on port ${port}`);
  console.log(`Notification app listening on http://localhost:${port}`);
});

module.exports = app;
