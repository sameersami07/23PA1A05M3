const test = require('node:test');
const assert = require('node:assert/strict');
const { topN, PriorityInbox } = require('../src/priority/inbox');

test('topN orders Placement > Result > Event', () => {
  const notifications = [
    {
      id: '1',
      type: 'Event',
      message: 'farewell',
      timestamp: new Date('2026-04-22T17:49:00Z'),
      isRead: false,
    },
    {
      id: '2',
      type: 'Placement',
      message: 'CSX hiring',
      timestamp: new Date('2026-04-22T17:50:00Z'),
      isRead: false,
    },
    {
      id: '3',
      type: 'Result',
      message: 'mid-sem',
      timestamp: new Date('2026-04-22T17:51:00Z'),
      isRead: false,
    },
  ];

  const inbox = topN(notifications, 2);
  assert.equal(inbox.length, 2);
  assert.equal(inbox[0].notification.type, 'Placement');
  assert.equal(inbox[1].notification.type, 'Result');
});

test('PriorityInbox keeps only top capacity items', () => {
  const inbox = new PriorityInbox(2);
  inbox.upsert({
    id: '1',
    type: 'Event',
    message: 'a',
    timestamp: new Date('2026-04-22T17:00:00Z'),
    isRead: false,
  });
  inbox.upsert({
    id: '2',
    type: 'Result',
    message: 'b',
    timestamp: new Date('2026-04-22T17:01:00Z'),
    isRead: false,
  });
  inbox.upsert({
    id: '3',
    type: 'Placement',
    message: 'c',
    timestamp: new Date('2026-04-22T17:02:00Z'),
    isRead: false,
  });

  const snapshot = inbox.snapshot();
  assert.equal(snapshot.length, 2);
  assert.equal(snapshot[0].notification.type, 'Placement');
});
