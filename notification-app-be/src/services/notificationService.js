const { getAccessToken, credentialsFromEnv, credentialsValid } = require('logging-middleware');

function mockNotifications() {
  return [
    {
      id: 'd146095a-0d86-4a34-9e69-3900a14576bc',
      type: 'Result',
      message: 'mid-sem',
      timestamp: new Date('2026-04-22T17:51:30Z'),
      isRead: false,
    },
    {
      id: 'b283218f-ea5a-4b7c-93a9-1f2f240d64b0',
      type: 'Placement',
      message: 'CSX Corporation hiring',
      timestamp: new Date('2026-04-22T17:51:18Z'),
      isRead: false,
    },
    {
      id: '81589ada-0ad3-4f77-9554-f52fb558e09d',
      type: 'Event',
      message: 'farewell',
      timestamp: new Date('2026-04-22T17:51:06Z'),
      isRead: false,
    },
    {
      id: 'a1111111-1111-1111-1111-111111111111',
      type: 'Event',
      message: 'tech fest',
      timestamp: new Date('2026-04-21T17:51:00Z'),
      isRead: false,
    },
    {
      id: 'a2222222-2222-2222-2222-222222222222',
      type: 'Placement',
      message: 'Google hiring',
      timestamp: new Date('2026-04-22T16:51:00Z'),
      isRead: false,
    },
  ];
}

function parseTimestamp(rawTime) {
  if (!rawTime) {
    return new Date();
  }
  const normalized = rawTime.includes('T') ? rawTime : rawTime.replace(' ', 'T') + 'Z';
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

async function loadNotifications() {
  if (process.env.USE_MOCK_DATA === 'true') {
    return mockNotifications();
  }

  const creds = credentialsFromEnv();
  if (!credentialsValid(creds)) {
    return mockNotifications();
  }

  const token = await getAccessToken(creds);
  const response = await fetch(`${creds.baseURL}/notifications`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const body = await response.text();
  if (!response.ok) {
    throw new Error(`notifications API failed (${response.status}): ${body}`);
  }

  const data = JSON.parse(body);
  return data.notifications.map((item) => ({
    id: item.ID,
    type: item.Type,
    message: item.Message,
    timestamp: parseTimestamp(item.Timestamp),
    isRead: false,
  }));
}

module.exports = { loadNotifications, mockNotifications };
